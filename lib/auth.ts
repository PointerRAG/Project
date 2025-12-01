import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { nextCookies } from "better-auth/next-js";
export const auth = betterAuth({
    emailAndPassword:{
       enabled:true
    },
    database: new Pool({
    host : process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    }),
    plugins: [nextCookies()]
})  