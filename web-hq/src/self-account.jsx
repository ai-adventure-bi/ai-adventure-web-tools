import React,{useState} from 'react';

export function SelfAccount({user,post,Modal,onClose,onSaved,onPasswordChanged}){
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e,password=false){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  const values=Object.fromEntries(new FormData(e.currentTarget));
  try{await post(`/users/${user.id}${password?'/password':''}`,values);if(password)onPasswordChanged();else{await onSaved();setNotice('Display name saved.');}}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <Modal title="My account" onClose={onClose}>
  <p>Your login: <strong>{user.role==='student'?user.permanentId:user.username}</strong></p>
  {user.role==='student'&&<p>Your permanent ID is your login. It stays the same when you change your display name.</p>}
  <form onSubmit={e=>submit(e)}><label>Display name<input name="name" defaultValue={user.name} required maxLength={80}/></label><button className="button primary" disabled={busy}>Save display name</button></form>
  <form onSubmit={e=>submit(e,true)}><h3>Change password</h3><p>Save your draft first. Changing your password signs you out on all devices.</p><label>Current password<input type="password" name="currentPassword" required autoComplete="current-password" maxLength={100}/></label><label>New password<input type="password" name="password" required autoComplete="new-password" minLength={user.role==='student'?8:1} maxLength={100}/></label>{user.role==='student'&&<p>Use at least 8 characters.</p>}<button className="button" disabled={busy}>Change password and sign out</button></form>
  {error&&<p className="error-box" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </Modal>;
}
