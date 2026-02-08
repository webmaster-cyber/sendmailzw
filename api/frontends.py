import falcon
import json
from .shared import config as _  # noqa: F401
from .shared.crud import CRUDCollection, CRUDSingle, check_noadmin, get_orig
from .shared.db import json_iter, json_obj, open_db, DB
from .shared.utils import run_task, gen_screenshot, get_webroot
from .shared.tasks import tasks, HIGH_PRIORITY
from .shared.log import get_logger

log = get_logger()


class LoginFrontend(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        with open_db() as db:
            row = db.row(
                "select data->>'image', data->>'favicon', data->>'customcss' from frontends where (data->'useforlogin')::boolean limit 1"
            )

            if row is not None:
                image, favicon, customcss = row
                req.context["result"] = {
                    "image": image,
                    "favicon": favicon,
                    "customcss": customcss,
                }
            else:
                req.context["result"] = {}


class Frontends(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "frontends"
        self.adminonly = True
        self.large = "image"
        self.userlog = "frontend"

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        doc = req.context["doc"]
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        if doc.get("useforlogin"):
            req.context["db"].execute(
                "update frontends set data = data || %s", {"useforlogin": False}
            )

        return CRUDCollection.on_post(self, req, resp)


class Frontend(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "frontends"
        self.adminonly = True
        self.userlog = "frontend"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        doc = req.context["doc"]
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        if doc.get("useforlogin"):
            req.context["db"].execute(
                "update frontends set data = data || %s where id != %s",
                {"useforlogin": False},
                id,
            )

        return CRUDSingle.on_patch(self, req, resp, id)

    def del_check(self, db: DB, id: str) -> None:
        if db.companies.find_one({"frontend": id}) is not None:
            raise falcon.HTTPBadRequest(
                title="Frontend in use",
                description="This frontend is assigned to one or more customers",
            )


@tasks.task(priority=HIGH_PRIORITY)
def get_screenshot(id: str) -> None:
    try:
        with open_db() as db:
            gen_screenshot(db, id, "gallerytemplates")
    except:
        log.exception("error")


@tasks.task(priority=HIGH_PRIORITY)
def get_beefree_screenshot(id: str) -> None:
    try:
        with open_db() as db:
            gen_screenshot(db, id, "beefreetemplates")
    except:
        log.exception("error")


@tasks.task(priority=HIGH_PRIORITY)
def get_form_screenshot(id: str) -> None:
    try:
        with open_db() as db:
            gen_screenshot(db, id, "formtemplates")
    except:
        log.exception("error")


class BeefreeTemplates(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "beefreetemplates"
        self.adminonly = True
        self.userlog = "beefree template"

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from beefreetemplates where cid = %s",
                    db.get_cid(),
                )
            )
        )

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDCollection.on_post(self, req, resp)

        run_task(get_beefree_screenshot, req.context["result"]["id"])


class BeefreeTemplate(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "beefreetemplates"
        self.adminonly = True
        self.userlog = "beefree template"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDSingle.on_patch(self, req, resp, id)

        run_task(get_beefree_screenshot, id)


class BeefreeTemplateDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        t = db.beefreetemplates.get(id)

        if t is None:
            raise falcon.HTTPForbidden()

        t["show"] = False

        orig, i = get_orig(t["name"])
        while True:
            t["name"] = "%s (%s)" % (orig, i)
            if db.beefreetemplates.find_one({"name": t["name"]}) is None:
                break
            i += 1

        req.context["result"] = db.beefreetemplates.add(t)


class AllBeefreeTemplatesSingle(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = json_obj(
            db.row(
                "select id, cid, data from beefreetemplates where cid = %s and id = %s and (data->>'show')::boolean",
                parentcid,
                id,
            )
        )
        if req.context["result"] is None:
            raise falcon.HTTPForbidden()


class AllBeefreeTemplates(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        broadcasts = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from campaigns where data->>'image' is not null and data->>'sent_at' is not null and coalesce(data->>'type', '') = 'beefree' and cid = %s order by data->>'sent_at' desc limit 20",
                    db.get_cid(),
                )
            )
        )
        transactional = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from txntemplates where data->>'image' is not null and coalesce(data->>'type', '') = 'beefree' and cid = %s order by lower(data->>'name')",
                    db.get_cid(),
                )
            )
        )
        messages = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from messages where data->>'image' is not null and coalesce(data->>'type', '') = 'beefree' and cid = %s order by data->>'modified' desc",
                    db.get_cid(),
                )
            )
        )

        for b in broadcasts:
            b["templatetype"] = "broadcast"
        for t in transactional:
            t["templatetype"] = "transactional"
        for m in messages:
            m["templatetype"] = "message"
            m["name"] = m["subject"]

        req.context["result"] = {
            "featured": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from beefreetemplates where (data->>'show')::boolean and cid = %s",
                        parentcid,
                    )
                )
            ),
            "recent": broadcasts + transactional + messages,
        }

        req.context["result"]["featured"] = sorted(
            req.context["result"]["featured"],
            key=lambda c: (c.get("order") or 0, c["name"].lower()),
        )

        for n in list(req.context["result"].keys()):
            for i in range(len(req.context["result"][n])):
                c = req.context["result"][n][i]
                req.context["result"][n][i] = {
                    "id": c["id"],
                    "name": c["name"],
                    "image": c["image"],
                    "templatetype": c.get("templatetype"),
                }


class AllTemplatesSingle(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = json_obj(
            db.row(
                "select id, cid, data from gallerytemplates where cid = %s and id = %s and (data->>'show')::boolean",
                parentcid,
                id,
            )
        )
        if req.context["result"] is None:
            raise falcon.HTTPForbidden()


class AllTemplates(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = {
            "featured": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from gallerytemplates where (data->>'show')::boolean and cid = %s",
                        parentcid,
                    )
                )
            ),
            "recent": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from campaigns where data->>'image' is not null and data->>'sent_at' is not null and coalesce(data->>'type', '') != 'beefree' and cid = %s order by data->>'sent_at' desc limit 20",
                        db.get_cid(),
                    )
                )
            ),
        }

        req.context["result"]["featured"] = sorted(
            req.context["result"]["featured"],
            key=lambda c: (c.get("order") or 0, c["name"].lower()),
        )

        for n in list(req.context["result"].keys()):
            for i in range(len(req.context["result"][n])):
                c = req.context["result"][n][i]
                req.context["result"][n][i] = {
                    "id": c["id"],
                    "name": c["name"],
                    "image": c["image"],
                }


class FormTemplates(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "formtemplates"
        self.adminonly = True
        self.userlog = "form template"

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from formtemplates where cid = %s",
                    db.get_cid(),
                )
            )
        )

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDCollection.on_post(self, req, resp)

        run_task(get_form_screenshot, req.context["result"]["id"])


class FormTemplate(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "formtemplates"
        self.adminonly = True
        self.userlog = "form template"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDSingle.on_patch(self, req, resp, id)

        run_task(get_form_screenshot, id)


class FormTemplateDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        t = db.formtemplates.get(id)

        if t is None:
            raise falcon.HTTPForbidden()

        t["show"] = False

        orig, i = get_orig(t["name"])
        while True:
            t["name"] = "%s (%s)" % (orig, i)
            if db.formtemplates.find_one({"name": t["name"]}) is None:
                break
            i += 1

        req.context["result"] = db.formtemplates.add(t)


class AllFormTemplatesSingle(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = json_obj(
            db.row(
                "select id, cid, data from formtemplates where cid = %s and id = %s and (data->>'show')::boolean",
                parentcid,
                id,
            )
        )
        if req.context["result"] is None:
            raise falcon.HTTPForbidden()


class AllFormTemplates(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = {
            "featured": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from formtemplates where (data->>'show')::boolean and cid = %s",
                        parentcid,
                    )
                )
            ),
        }

        req.context["result"]["featured"] = sorted(
            req.context["result"]["featured"],
            key=lambda c: (c.get("order") or 0, c["name"].lower()),
        )

        for n in list(req.context["result"].keys()):
            for i in range(len(req.context["result"][n])):
                c = req.context["result"][n][i]
                req.context["result"][n][i] = {
                    "id": c["id"],
                    "name": c["name"],
                    "image": c["image"],
                }


class GalleryTemplates(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "gallerytemplates"
        self.adminonly = True
        self.userlog = "gallery template"

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from gallerytemplates where cid = %s",
                    db.get_cid(),
                )
            )
        )

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDCollection.on_post(self, req, resp)

        run_task(get_screenshot, req.context["result"]["id"])


class GalleryTemplate(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "gallerytemplates"
        self.adminonly = True
        self.userlog = "gallery template"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDSingle.on_patch(self, req, resp, id)

        run_task(get_screenshot, id)


class GalleryTemplateDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        t = db.gallerytemplates.get(id)

        if t is None:
            raise falcon.HTTPForbidden()

        t["show"] = False

        orig, i = get_orig(t["name"])
        while True:
            t["name"] = "%s (%s)" % (orig, i)
            if db.gallerytemplates.find_one({"name": t["name"]}) is None:
                break
            i += 1

        req.context["result"] = db.gallerytemplates.add(t)


class SignupSettings(CRUDCollection):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        obj = db.signupsettings.get_singleton()

        if "initialize" not in obj:
            obj["rawText"] = ""
            obj["frontend"] = ""
            obj["initialize"] = True
            obj["subject"] = "Confirm Sign-up"
            obj["requireconfirm"] = False
        req.context["result"] = obj

    def on_patch(self, req: falcon.Request, resp: falcon.Response) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db.signupsettings.patch_singleton(doc)


class Signup:

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        with open_db() as db:
            obj = db.signupsettings.get(id)

            if obj is None:
                raise falcon.HTTPNotFound()

            # Get active plans for the comparison view
            plans = list(
                json_iter(
                    db.execute(
                        "select id, cid, data from plans where (data->>'active')::boolean order by (data->>'sort_order')::int, data->>'name'"
                    )
                )
            )

            # Get frontend for branding
            frontend = None
            if obj.get("frontend"):
                frontend = db.frontends.get(obj["frontend"])

            brand_name = "SendMail"
            brand_image = ""
            brand_color = "#006FC2"
            if frontend:
                brand_name = frontend.get("name", brand_name)
                brand_image = frontend.get("image", "")

            preselected = req.get_param("plan", default="")

            # Build plan cards HTML
            plan_cards = ""
            for p in plans:
                slug = p.get("slug", "")
                is_selected = slug == preselected
                is_free = p.get("is_free", False)
                price_usd = p.get("price_usd", 0)
                billing = p.get("billing_period", "monthly")
                period_label = "/yr" if billing == "yearly" else "/mo"
                price_display = "Free" if is_free else "$%s%s" % (price_usd, period_label)

                sub_limit = p.get("subscriber_limit")
                send_limit = p.get("send_limit_monthly")
                trial_days = p.get("trial_days", 0)
                features = p.get("features", {})
                description = p.get("description", "")

                sub_text = "{:,}".format(sub_limit) + " subscribers" if sub_limit else "Unlimited subscribers"
                send_text = "{:,}".format(send_limit) + " sends/mo" if send_limit else "Unlimited sends"

                feature_list = ""
                feature_items = features if isinstance(features, list) else []
                for feat in feature_items:
                    fname = feat.get("name", "")
                    if not fname:
                        continue
                    if feat.get("included", False):
                        feature_list += '<li class="feature-item"><svg class="check" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>%s</li>' % fname
                    else:
                        feature_list += '<li class="feature-item disabled"><svg class="cross" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>%s</li>' % fname

                trial_badge = ""
                if trial_days > 0 and not is_free:
                    trial_badge = '<span class="trial-badge">%s-day free trial</span>' % trial_days

                selected_class = " selected" if is_selected else ""
                popular_tag = ""
                if not is_free and len(plans) > 1 and p == ([x for x in plans if not x.get("is_free", False)] or [None])[0]:
                    popular_tag = '<div class="popular-tag">Most Popular</div>'

                plan_cards += """
                <div class="plan-card%s" data-plan-id="%s" data-plan-slug="%s">
                    %s
                    <h3 class="plan-name">%s</h3>
                    <p class="plan-desc">%s</p>
                    <div class="plan-price">%s</div>
                    %s
                    <div class="plan-limits">
                        <div>%s</div>
                        <div>%s</div>
                    </div>
                    <ul class="feature-list">%s</ul>
                    <button type="button" class="select-btn%s" onclick="selectPlan('%s', '%s')">
                        %s
                    </button>
                </div>
                """ % (
                    selected_class, p["id"], slug,
                    popular_tag,
                    p.get("name", "Plan"),
                    description,
                    price_display,
                    trial_badge,
                    sub_text, send_text,
                    feature_list,
                    " selected" if is_selected else "",
                    p["id"], slug,
                    "Selected" if is_selected else ("Get Started" if is_free else "Choose Plan"),
                )

            require_approval = obj.get("require_approval", True)
            approval_note = (
                "<p class='approval-note'>All new accounts are reviewed before activation. "
                "You'll receive an email once your account is approved.</p>"
                if require_approval else ""
            )

            resp.body = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign Up - %s</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh}
.header{text-align:center;padding:2rem 1rem 1rem}
.header img{height:40px;margin-bottom:0.5rem}
.header h1{font-size:1.5rem;font-weight:700;margin-bottom:0.25rem}
.header p{color:#64748b;font-size:0.95rem}
.plans-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:1.5rem;padding:1.5rem 1rem;max-width:1200px;margin:0 auto}
.plan-card{background:white;border-radius:12px;border:2px solid #e2e8f0;padding:2rem;width:100%%;max-width:340px;position:relative;transition:border-color .2s,box-shadow .2s;cursor:pointer;display:flex;flex-direction:column}
.plan-card:hover{border-color:#94a3b8;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.plan-card.selected{border-color:%s;box-shadow:0 4px 16px rgba(0,111,194,0.15)}
.popular-tag{position:absolute;top:-12px;left:50%%;transform:translateX(-50%%);background:%s;color:white;font-size:.75rem;font-weight:600;padding:.25rem .75rem;border-radius:999px}
.plan-name{font-size:1.25rem;font-weight:700;margin-bottom:.25rem}
.plan-desc{color:#64748b;font-size:.85rem;margin-bottom:1rem;min-height:2.5rem}
.plan-price{font-size:2.25rem;font-weight:800;margin-bottom:.5rem}
.trial-badge{display:inline-block;background:#eff6ff;color:#3b82f6;font-size:.75rem;font-weight:600;padding:.2rem .6rem;border-radius:999px;margin-bottom:.75rem}
.plan-limits{font-size:.85rem;color:#475569;margin-bottom:1rem;line-height:1.6}
.feature-list{list-style:none;margin-bottom:1.5rem;flex:1}
.feature-item{display:flex;align-items:center;gap:.4rem;font-size:.85rem;padding:.2rem 0;color:#334155}
.feature-item.disabled{color:#cbd5e1}
.check{width:16px;height:16px;color:#22c55e;flex-shrink:0}
.cross{width:16px;height:16px;color:#cbd5e1;flex-shrink:0}
.select-btn{width:100%%;padding:.7rem;border:2px solid #e2e8f0;background:white;color:#334155;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;transition:all .15s}
.select-btn:hover{border-color:%s;color:%s}
.select-btn.selected{background:%s;color:white;border-color:%s}

/* Step 2: Signup form */
.signup-step{display:none;max-width:560px;margin:0 auto;padding:1.5rem 1rem}
.signup-step.active{display:block}
.step-back{display:inline-flex;align-items:center;gap:.4rem;color:#64748b;font-size:.9rem;cursor:pointer;border:none;background:none;padding:.5rem 0;margin-bottom:1rem}
.step-back:hover{color:#334155}
.selected-plan-banner{background:white;border:2px solid %s;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center}
.selected-plan-banner .spb-name{font-weight:700;font-size:1.1rem}
.selected-plan-banner .spb-price{font-weight:700;color:%s}
.form-card{background:white;border-radius:12px;border:1px solid #e2e8f0;padding:2rem}
.form-card h2{font-size:1.2rem;font-weight:700;margin-bottom:.25rem}
.form-card .form-subtitle{color:#64748b;font-size:.85rem;margin-bottom:1.5rem}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.form-group{margin-bottom:1rem}
.form-group.full{grid-column:1/-1}
.form-group label{display:block;font-size:.8rem;font-weight:600;margin-bottom:.3rem;color:#334155;text-transform:uppercase;letter-spacing:.03em}
.form-group input,.form-group textarea{width:100%%;padding:.6rem .75rem;border:1px solid #d1d5db;border-radius:8px;font-size:.9rem;font-family:inherit}
.form-group input:focus,.form-group textarea:focus{outline:none;border-color:%s;box-shadow:0 0 0 3px rgba(0,111,194,0.1)}
.form-group textarea{resize:vertical;min-height:70px}
.form-group .hint{font-size:.75rem;color:#94a3b8;margin-top:.2rem}
.submit-btn{width:100%%;padding:.75rem;background:%s;color:white;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:.5rem}
.submit-btn:hover{opacity:.9}
.submit-btn:disabled{opacity:.6;cursor:not-allowed}
.approval-note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:.75rem 1rem;font-size:.85rem;color:#92400e;margin-bottom:1rem}
#signuperror{color:#dc2626;font-size:.85rem;margin-bottom:.75rem;display:none}
#signuperror.show{display:block}
@media(max-width:768px){.plans-grid{flex-direction:column;align-items:center}.plan-card{max-width:100%%}.form-row{grid-template-columns:1fr}}
</style>
</head>
<body>

<!-- Step 1: Plan selection -->
<div id="step1" class="active">
<div class="header">
%s
<h1>Choose your plan</h1>
<p>Select a plan to get started.</p>
</div>
<div class="plans-grid">%s</div>
</div>

<!-- Step 2: Signup form -->
<div id="step2" class="signup-step">
<button type="button" class="step-back" onclick="goBack()">
<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
Back to plans
</button>

<div class="selected-plan-banner">
<div>
<div class="spb-name" id="spbName"></div>
</div>
<div class="spb-price" id="spbPrice"></div>
</div>

<div class="form-card">
<h2>Create your account</h2>
<p class="form-subtitle">Tell us about yourself and your organisation.</p>

%s

<div id="signuperror"></div>

<form id="signupform">
<input type="hidden" name="plan_id" id="plan_id_field" value="">

<div class="form-row">
<div class="form-group">
<label for="firstname">First Name</label>
<input type="text" id="firstname" name="firstname" required>
</div>
<div class="form-group">
<label for="lastname">Last Name</label>
<input type="text" id="lastname" name="lastname" required>
</div>
</div>

<div class="form-group">
<label for="email">Email Address</label>
<input type="email" id="email" name="email" required>
</div>

<div class="form-group">
<label for="companyname">Company / Organisation</label>
<input type="text" id="companyname" name="companyname" required>
</div>

<div class="form-group">
<label for="phone">Phone Number</label>
<input type="tel" id="phone" name="phone">
</div>

<div class="form-group">
<label for="address">Physical Address</label>
<textarea id="address" name="address" rows="2" required placeholder="Street address, city, country"></textarea>
<div class="hint">Required for CAN-SPAM / anti-spam compliance</div>
</div>

<div class="form-group">
<label for="website">Website (optional)</label>
<input type="url" id="website" name="website" placeholder="https://">
</div>

<div class="form-group">
<label for="use_case">What will you use this for?</label>
<input type="text" id="use_case" name="use_case" placeholder="e.g. Monthly newsletter, product updates" required>
<div class="hint">Helps us understand your needs and speed up approval</div>
</div>

<button type="submit" class="submit-btn" id="submitBtn">Create Account</button>
</form>
</div>
</div>

<script>
var selectedPlanId = '';
var selectedPlanName = '';
var selectedPlanPrice = '';
var preselected = '%s';

var planData = {};
document.querySelectorAll('.plan-card').forEach(function(c) {
    planData[c.dataset.planId] = {
        name: c.querySelector('.plan-name').textContent,
        price: c.querySelector('.plan-price').textContent,
        slug: c.dataset.planSlug
    };
});

function selectPlan(planId, slug) {
    selectedPlanId = planId;
    var info = planData[planId] || {};
    selectedPlanName = info.name || '';
    selectedPlanPrice = info.price || '';

    document.getElementById('plan_id_field').value = planId;
    document.getElementById('spbName').textContent = selectedPlanName;
    document.getElementById('spbPrice').textContent = selectedPlanPrice;

    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').classList.add('active');
    window.scrollTo(0, 0);
}

function goBack() {
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step1').style.display = 'block';
    window.scrollTo(0, 0);
}

// Auto-select if plan preselected via URL (match by ID or slug)
if (preselected) {
    var matchId = preselected;
    if (!planData[matchId]) {
        Object.keys(planData).forEach(function(id) {
            if (planData[id].slug === preselected) matchId = id;
        });
    }
    if (planData[matchId]) {
        selectPlan(matchId, planData[matchId].slug);
    }
}
</script>
<script src="%s/api/signupaction/%s"></script>
</body>
</html>""" % (
                brand_name,
                brand_color, brand_color, brand_color, brand_color, brand_color, brand_color,
                brand_color, brand_color,
                brand_color, brand_color,
                '<img src="%s" alt="%s">' % (brand_image, brand_name) if brand_image else "",
                plan_cards,
                approval_note,
                preselected or obj.get("default_plan", ""),
                get_webroot(), id,
            )
            resp.content_type = "text/html"
            resp.status = falcon.HTTP_200


class SignupAction:
    def on_options(self, req: falcon.Request, resp: falcon.Response) -> None:
        resp.set_header("Access-Control-Allow-Origin", "*")
        resp.set_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        resp.set_header(
            "Access-Control-Allow-Headers",
            req.get_header("Access-Control-Request-Headers") or "*",
        )
        resp.set_header("Access-Control-Max-Age", 86400)

        resp.set_header("Allow", "POST, OPTIONS")
        resp.content_type = "text/plain"

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        resp.set_header("Access-Control-Allow-Origin", "*")
        resp.set_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        resp.set_header(
            "Access-Control-Allow-Headers",
            req.get_header("Access-Control-Request-Headers") or "*",
        )
        resp.set_header("Access-Control-Max-Age", 86400)

        with open_db() as db:
            obj = db.signupsettings.get(id)

            if obj is None:
                raise falcon.HTTPNotFound()

            resp.body = """
window.addEventListener('load', function() {
    var settings = %s;
    var form = document.getElementById('signupform');

    form.addEventListener('submit', function(e) {
        var email = '';

        e.preventDefault();

        var topFields = ['email','firstname','lastname','companyname','plan_id'];
        var data = {
          signup: settings.signup,
          params: {}
        };
        for (var i = 0; i < form.elements.length; i++) {
            var el = form.elements[i];
            if (el.name) {
                if (el.name === 'email') {
                    email = el.value;
                    data.email = el.value;
                } else if (topFields.indexOf(el.name) !== -1) {
                    data[el.name] = el.value;
                } else {
                    data.params[el.name] = el.value;
                }
            }
        }
        // Check URL params for plan
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('plan')) {
            data.plan_id = urlParams.get('plan');
        }
        let xhr = new XMLHttpRequest();
        xhr.open('POST', '%s/api/invite', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                window.location.href = '%s/activate?username=' + encodeURIComponent(email) + '&confirm=' + settings.confirm;
            } else {
                var result = document.getElementById('signuperror');
                if (result) {
                    result.classList.add('error');
                    try {
                        var response = JSON.parse(xhr.responseText);
                        result.innerText = response.title + ': ' + response.description;
                    } catch (e) {
                        result.innerText = 'An error occurred. Please try again later.';
                    }
                }
            }
        };
        xhr.send(JSON.stringify(data));
    });
});
""" % (
                json.dumps({"signup": id, "confirm": obj["requireconfirm"]}),
                get_webroot(),
                get_webroot(),
            )
            resp.content_type = "text/javascript"
            resp.status = falcon.HTTP_200
