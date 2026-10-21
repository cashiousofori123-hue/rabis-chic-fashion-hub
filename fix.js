const fs=require('fs');
fs.mkdirSync('src/pages/admin',{recursive:true});
fs.writeFileSync('src/pages/admin/AdminLayout.jsx',
import { Link } from 'react-router-dom'
export default function AdminLayout(){
 return (
  <div className='min-h-screen bg-[#f5f5f5] p-4'>
   <div className='max-w-md mx-auto'>
    <div className='bg-white rounded-2xl p-4 flex items-center gap-3 mb-4 shadow-sm'>
     <img src='/onupa.jpg' onError={e=>e.target.src='https://i.pravatar.cc/100'} className='w-12 h-12 rounded-full' />
     <div><p className='font-bold'>Admin - Rabis Chic</p><p className='text-xs text-gray-500'>Be an Eagle not a Chicken</p></div>
    </div>
    <div className='space-y-2'>
     <Link to='/admin/products' className='bg-white rounded-xl p-4 flex justify-between'><span>Products - Phone Upload</span><span>></span></Link>
     <Link to='/admin/orders' className='bg-white rounded-xl p-4 flex justify-between'><span>Orders</span><span>></span></Link>
     <Link to='/admin/users' className='bg-white rounded-xl p-4 flex justify-between'><span>Users</span><span>></span></Link>
     <Link to='/' className='bg-black text-white rounded-xl p-4 text-center block mt-4'>Visit Site</Link>
    </div>
   </div>
  </div>
 )
}
);
fs.writeFileSync('src/pages/admin/Products.jsx',
import {useState,useEffect} from 'react'
export default function Products(){
 const [products,setProducts]=useState([]); const [show,setShow]=useState(false);
 const [form,setForm]=useState({name:'',price:'',category:'Women',status:'in_stock',images:[]});
 useEffect(()=>{fetch('/api/products').then(r=>r.json()).then(d=>setProducts(d.products||d||[]))},[]);
 const save=async()=>{
  const fd=new FormData(); fd.append('name',form.name); fd.append('price',form.price); fd.append('category',form.category); fd.append('status',form.status); fd.append('isDefault','false');
  form.images.forEach(f=>fd.append('images',f));
  const res=await fetch('/api/products',{method:'POST',body:fd});
  if(res.ok){alert('Added'); location.reload()} else alert('Failed');
 };
 return (<div className='p-4'><a href='/admin'>Back</a><h1>Products {products.length}</h1><button onClick={()=>setShow(true)} className='bg-black text-white p-2'>+ Add New</button>{show&&<div className='border p-4 mt-2'><input type='file' accept='image/*' multiple capture='environment' onChange={e=>setForm({...form,images:[...e.target.files]})} /><input placeholder='Name' value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className='border p-2 w-full mt-2'/><input placeholder='Price' type='number' value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className='border p-2 w-full mt-2'/><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className='border p-2 w-full mt-2'><option>Women</option><option>Men</option><option>Dresses</option><option>Tops</option><option>Bags</option><option>Shoes</option></select><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className='border p-2 w-full mt-2'><option value='in_stock'>In Stock</option><option value='out_of_stock'>Out of Stock</option><option value='just_sold'>Just Sold</option><option value='sold'>Sold</option></select><button onClick={save} className='bg-black text-white p-2 w-full mt-2'>Save</button></div>}<div className='grid grid-cols-2 gap-2 mt-4'>{products.map(p=><div key={p._id||p.id} className='border p-2'><img src={p.images?.[0]||p.image} className='h-20 w-full object-cover'/><p>{p.name} - {p.price}</p>{p.isDefault&&<span>LOCK Default</span>}</div>)}</div></div>)
}
);
console.log('Files created');
let app=fs.readFileSync('src/App.jsx','utf8');
if(!app.includes('AdminLayout')){
 app=app.replace(/import.*from.*['\"]\.\/pages\/Admin.*['\"].*\n/,'');
 app=app.replace(/import\s+{\s*[^}]*}\s+from\s+['\"]react-router-dom['\"]/,\$& 
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminProducts from './pages/admin/Products.jsx');
 app=app.replace(/<Route[^>]*path=[\"']\/admin[\"'][^>]*\/>/g,'');
 app=app.replace(/<Route[^>]*path=[\"']\/admin[\"'][^>]*>.*?<\/Route>/gs,'');
 app=app.replace('</Routes>',  <Route path='/admin' element={<AdminLayout/>} />
  <Route path='/admin/products' element={<AdminProducts/>} />
  <Route path='/admin-dashboard' element={<AdminLayout/>} />
</Routes>);
 fs.writeFileSync('src/App.jsx',app);
 console.log('App.jsx fixed');
}
