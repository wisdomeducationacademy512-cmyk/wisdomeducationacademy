# School Management System — Week 1

## Abhi Kya Bana Hai

- ✅ Login page (no signup — sirf admin accounts bana sakta hai)
- ✅ Admin Dashboard (overview stats + students list)
- ✅ Add Student form — automatic ID generate karta hai (STU-2025-001 format)
- ✅ Parent login automatically ban jata hai jab student add ho (password = parent phone number)

---

## ZAROORI: Pehla Admin Account Banao

Chunke system mein koi "Sign Up" button nahi hai, **pehla admin account tumhe khud Firebase console se manually banana hoga.**

### Step 1 — Authentication mein User Banao
1. Firebase Console → **Authentication** → **Users** tab
2. **"Add user"** button dabao
3. Email: `admin@school.com` (ya jo bhi chaho)
4. Password: koi strong password (yaad rakho)
5. **Add user** dabao
6. Jo UID generate hoga, usay copy kar lo (ek lambi string hogi)

### Step 2 — Firestore mein Role Add Karo
1. Firebase Console → **Firestore Database** → **Data** tab
2. **"Start collection"** dabao
3. Collection ID: `users`
4. Document ID: **woh UID paste karo jo Step 1 mein copy kiya tha**
5. Field add karo:
   - Field: `role` | Type: string | Value: `admin`
6. **Save** dabao

Ab is email/password se login kar sakte ho admin ke roop mein.

---

## GitHub Pe Upload Kaise Karo

1. GitHub.com pe naya repository banao (e.g. `school-management-system`)
2. Is poore folder ko upload karo (drag & drop ya git commands se)
3. Repository → **Settings** → **Pages**
4. Source: **main branch** → **/ (root)** → Save
5. 2-3 minute mein link milega: `https://tumharaUsername.github.io/school-management-system/`

---

## File Structure

```
school-app/
├── index.html              ← Login page
├── pages/
│   └── admin-dashboard.html ← Admin dashboard
├── js/
│   ├── firebase-config.js   ← Firebase settings
│   ├── auth.js               ← Login logic
│   ├── admin-dashboard.js    ← Dashboard logic
│   └── add-student.js        ← Add student logic
```

---

## Test Kaise Karo

1. `index.html` ko browser mein kholo (ya GitHub Pages link)
2. Admin email/password se login karo
3. "Add Student" pe jao, ek student add karo
4. Success message mein Student ID + Password milega
5. Logout karo, us Student ID + Password se login karne ki koshish karo (parent dashboard abhi nahi bana — Week 2 mein banega)

---

## Next (Week 2)

- Classes & Sections setup
- Teacher management
- Student ID Cards with QR code generation
- Edit/Delete student
