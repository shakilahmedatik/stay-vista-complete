import axios from 'axios'
import axiosSecure from '.'
// Upload image in imgbb
export const imageUpload = async image => {
  const formData = new FormData()
  formData.append('image', image)
  const { data } = await axios.post(
    `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
    formData
  )
  return data
}
// admin stat
export const getAdminStat = async () => {
  const { data } = await axiosSecure(`/admin-stat`)
  return data
}
// Host statistics
export const getHostStat = async () => {
  const { data } = await axiosSecure.get('/host-stat')
  return data
}
// Guest statistics
export const getGuestStat = async () => {
  const { data } = await axiosSecure.get('/guest-stat')

  return data
}
