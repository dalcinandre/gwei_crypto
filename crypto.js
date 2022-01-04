const axios = require('axios')
const { COIN, ADDRESS, PAYOUT_LIMIT } = process.env

const client = axios.create({
  baseURL: 'https://api.flexpool.io/v2',
  headers: { 'Content-Type': 'application/json' },
  params: {
    coin: COIN,
    address: ADDRESS
  }
})

const getDetails = async () => {
  const { data } = await client.get(`/miner/details`)
  return data.result
}

const getBalance = async () => {
  const { data } = await client.get(`/miner/balance`)
  return data.result
}

const setPayoutSettings = async ({ maxFeePrice, ipAddress, network = 'mainnet', payoutLimit }) => {
  await client.put(`/miner/payoutSettings?ipAddress=${ipAddress}&maxFeePrice=${maxFeePrice}&network=${network}&payoutLimit=${payoutLimit}`)
}

const parseGwei = currentNetworkFeePrice => {
  return parseInt(currentNetworkFeePrice/1000000000)
}

const getIpAddress = async () => {
  return Promise.race([
    new Promise((resolve, _) => resolve(axios.get('https://ifconfig.me'))),
    new Promise((resolve, _) => resolve(axios.get('https://icanhazip.com'))),
    new Promise((resolve, _) => resolve(axios.get('https://api.ipify.org'))),
    new Promise((resolve, _) => resolve(axios.get('https://ident.me'))),
    new Promise((resolve, _) => resolve(axios.get('https://ipecho.net/plain')))
  ])
}

(async () => {
  try {
    const { payoutLimit, currentNetworkFeePrice, maxFeePrice } = await getDetails()
    const { balance } = await getBalance()

    const currentPercent = parseFloat((balance/payoutLimit) * 100).toFixed(2)
    const change = parseFloat(currentPercent) > 98

    if (change) {
      const gwei = parseGwei(currentNetworkFeePrice)

      if ((gwei < parseFloat(maxFeePrice)) || (gwei < 100)) {
        const ipAddress = (await getIpAddress()).data.replace(/\n/g, '')
        await setPayoutSettings({ maxFeePrice: gwei, ipAddress, payoutLimit: PAYOUT_LIMIT })
        console.log(`Alterado Gwei para ${gwei}`)
      }
    }

    console.log('MaxFeePrice atual:', maxFeePrice)
    console.log('Gwei atual:', parseGwei(currentNetworkFeePrice))
    console.log('Percentual minerado:', parseFloat(currentPercent))
  } catch (err) {
    console.error(err)
  }
})()
