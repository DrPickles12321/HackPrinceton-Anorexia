import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey:            import.meta.env.AIzaSyB_NolvYUxepL7daqEGsg_c2wgN50SidPI,
  authDomain:        import.meta.env.plate-together.firebaseapp.com,
  databaseURL:       import.meta.env.https://plate-together-default-rtdb.firebaseio.com,
  projectId:         import.meta.env.plate-together,
  storageBucket:     import.meta.env.plate-together.firebasestorage.app,
  messagingSenderId: import.meta.env.987215224656,
  appId:             import.meta.env.1:987215224656:web:eaef7fd283231bd81c1655,
  measurementId:     import.meta.env.G-PQCG8MW740,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)
