import { Link } from 'react-router-dom'
export default function AdminLayout(){
 return (
  <div className='min-h-screen bg-[#f5f5f5] p-4'>
   <div className='max-w-md mx-auto'>
    <div className='bg-white rounded-2xl p-4 flex gap-3 mb-4'>
     <img src='/onupa.jpg' className='w-12 h-12 rounded-full' />
     <div><p className='font-bold'>Admin - Rabis Chic</p><p className='text-xs'>Be an Eagle not a Chicken</p></div>
    </div>
    <Link to='/admin/products' className='bg-white rounded-xl p-4 flex justify-between mb-2'><span>👗 Products - Add from phone</span><span>›</span></Link>
    <Link to='/admin/orders' className='bg-white rounded-xl p-4 flex justify-between mb-2'><span>📦 Orders</span><span>›</span></Link>
    <Link to='/' className='bg-black text-white rounded-xl p-4 text-center block mt-6'>Visit Site</Link>
   </div>
  </div>
 )
}