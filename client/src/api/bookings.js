import axiosSecure from '.'

// create payment intent
export const createPaymentIntent = async price => {
  const { data } = await axiosSecure.post('/create-payment-intent', price)
  return data
}
// save booking info in db
export const saveBookingInfo = async paymentInfo => {
  const { data } = await axiosSecure.post('/bookings', paymentInfo)
  return data
}
// update room status after booking in db
export const updateStatus = async (id, status) => {
  const { data } = await axiosSecure.patch(`/rooms/status/${id}`, { status })
  return data
}
// get all bookings for a guest by email
export const getBookings = async email => {
  const { data } = await axiosSecure(`/bookings?email=${email}`)
  return data
}
// get all bookings for a host by email
export const getHostBookings = async email => {
  const { data } = await axiosSecure(`/bookings/host?email=${email}`)
  return data
}
// delete a booking
export const deleteBooking = async id => {
  const { data } = await axiosSecure.delete(`/bookings/${id}`)
  return data
}
