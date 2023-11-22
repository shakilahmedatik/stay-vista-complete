import React, { useEffect, useState } from 'react'
import { Chart } from 'react-google-charts'
import Loader from '../../Shared/Loader'

// export const data = [
//   ['Year', 'Sales', 'Expenses'],
//   ['11/23', 1000],
//   ['2005', 1170],
//   ['2006', 660],
//   ['2007', 1030],
// ]

export const options = {
  title: 'Sales Over Time',
  curveType: 'function',
  legend: { position: 'bottom' },
  series: [{ color: '#F43F5E' }],
}
const SalesLineChart = ({ data }) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }, [])
  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <Chart
          chartType='LineChart'
          width='100%'
          height='400px'
          data={data}
          options={options}
        />
      )}
    </>
  )
}

export default SalesLineChart
