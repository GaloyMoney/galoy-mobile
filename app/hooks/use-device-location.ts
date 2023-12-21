import { useApolloClient } from "@apollo/client"
import { useEffect, useState } from "react"
import { updateCountryCode } from "@app/graphql/client-only-query"
import { useCountryCodeQuery } from "@app/graphql/generated"
import axios from "axios"
import { CountryCode } from "libphonenumber-js/mobile"

const useDeviceLocation = () => {
  const client = useApolloClient()
  const { data } = useCountryCodeQuery()

  const [loading, setLoading] = useState(true)
  const [countryCode, setCountryCode] = useState<CountryCode>("SV")

  useEffect(() => {
    if (data) {
      const getLocation = async () => {
        try {
          const response = await axios.get("https://ipapi.co/json/", {
            timeout: 5000,
          })
          const _countryCode = response?.data?.country_code
          if (_countryCode) {
            setCountryCode(_countryCode)
            updateCountryCode(client, _countryCode)
          } else {
            console.warn("no data or country_code in response")
          }
          // can throw a 429 for device's rate-limiting. resort to cached value if available
        } catch (e) {
          if (data.countryCode) {
            setCountryCode(data.countryCode as CountryCode)
          }
        }
        setLoading(false)
      }
      getLocation()
    }
  }, [data, client, setLoading, setCountryCode])

  return {
    countryCode,
    loading,
  }
}

export default useDeviceLocation
