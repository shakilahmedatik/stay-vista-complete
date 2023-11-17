import Container from '../../components/Shared/Container'
import { useLoaderData } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Header from '../../components/RoomDetails/Header'
import RoomInfo from '../../components/RoomDetails/RoomInfo'
import RoomReservation from '../../components/RoomDetails/RoomReservation'

const RoomDetails = () => {
  const room = useLoaderData()

  return (
    <Container>
      <Helmet>
        <title>{room?.title}</title>
      </Helmet>
      {room && (
        <div className='max-w-screen-lg mx-auto'>
          <div className='flex flex-col gap-6'>
            <Header room={room} />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6'>
            <RoomInfo room={room} />

            <div className='md:col-span-3 order-first md:order-last mb-10'>
              {/* RoomReservation */}
              <RoomReservation room={room} />
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export default RoomDetails
