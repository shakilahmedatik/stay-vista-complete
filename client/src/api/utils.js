import axios from 'axios'
import axiosSecure from '.'

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
