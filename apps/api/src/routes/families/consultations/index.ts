import { Router } from 'express'
import consultations from './consultations'
import slots from './slots'
import proposals from './proposals'

const r = Router()

r.use(consultations)  // /consultations, /consultations/:id/...
r.use(slots)          // /librarians/:librarianId/slots, /slots/:id
r.use(proposals)      // /consultations/:id/proposals, /proposals/:proposalId/...

export default r
