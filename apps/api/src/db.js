// One shared Prisma client for the whole API.
import './config.js'
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
