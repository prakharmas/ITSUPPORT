const CRM_API = import.meta.env.VITE_CRM_API_URL
const CRM_EMAIL = import.meta.env.VITE_CRM_EMAIL
const CRM_PASSWORD = import.meta.env.VITE_CRM_PASSWORD


export const fetchCRMClients = async () => {
  const loginResponse = await fetch(`${CRM_API}/auth/login`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: CRM_EMAIL,
      password: CRM_PASSWORD
    })
  })

  if (!loginResponse.ok) {
    throw new Error('CRM login failed')
  }

  const loginData = await loginResponse.json()
  const token = loginData.access_token

  if (!token) {
    throw new Error('Access token not received')
  }

  const clientsResponse = await fetch(`${CRM_API}/agents/clients-rights`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  if (!clientsResponse.ok) {
    throw new Error('Failed to fetch clients')
  }

  const data = await clientsResponse.json()

  return (data || []).sort((a, b) =>
    String(a.company_name).localeCompare(String(b.company_name))
  )
}
