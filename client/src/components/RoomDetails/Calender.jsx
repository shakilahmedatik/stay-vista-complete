/* eslint-disable react/prop-types */
import { DateRange } from 'react-date-range'

const Calender = ({ value, handleDateChange }) => {
  return (
    <DateRange
      ranges={[value]}
      rangeColors={['#F43F5E']}
      direction='vertical'
      showDateDisplay={false}
      onChange={handleDateChange}
    />
  )
}

export default Calender
