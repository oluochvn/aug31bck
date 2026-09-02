import bcrypt from "bcrypt"

    const saltRound = 10;

   export async function hashed(password) {
    
        const hash = await bcrypt.hash(password.toString(),saltRound)
        return hash;
    }
    

    export async function matched(password,storedHash) {

        return await bcrypt.compare(password.toString(), storedHash);
    }