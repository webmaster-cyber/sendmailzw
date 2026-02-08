export interface LoginResponse {
  uid: string
  cookie: string
  changepass: boolean
  admin: boolean
}

export interface User {
  id: string
  fullname: string
  companyname: string
  email: string
  admin: boolean
  photo?: string
  frontend?: Frontend
  nodataexport?: boolean
  software_version?: string
  disabled?: boolean
  banned?: boolean
  inreview?: boolean
  apikey?: string
  smtphost?: string
}

export interface Frontend {
  id: string
  name: string
  image?: string
  favicon?: string
  customcss?: string
  bouncerate: number
  complaintrate: number
  invitename: string
  inviteemail: string
  hourlimit: number
  daylimit: number
  monthlimit: number
  trialdays: number
  useforlogin?: boolean
  domainrates?: DomainRate[]
}

export interface DomainRate {
  domain: string
  bouncerate: number
  complaintrate: number
}

export interface LoginFrontend {
  image?: string
  favicon?: string
  customcss?: string
}

export interface AuthState {
  uid: string
  cookie: string
  impersonate: string
  user: User | null
  isLoading: boolean
}
