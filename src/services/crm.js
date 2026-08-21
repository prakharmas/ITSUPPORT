const CRM_API = 'https://crmapi.dialdesk.in'

export const fetchCRMClients = async () => {
  const loginResponse = await fetch(`${CRM_API}/auth/login`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'krishna.kumar@teammas.in',
      password: '5678'
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

  return await clientsResponse.json()
}
