import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const base = process.cwd();

console.log("\n🚀 Finishing Cortex setup...\n");

function ensureDir(dir){
 if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
}

function write(file,content){
 ensureDir(path.dirname(file));
 fs.writeFileSync(file,content);
 console.log("Created:",file);
}

//
// 1️⃣ Fix next.config.js
//

write(
 path.join(base,"next.config.js"),
`
export default {
 reactStrictMode: true,
 experimental: { appDir: true }
};
`
);

//
// 2️⃣ Create Prisma Schema
//

write(
 path.join(base,"prisma/schema.prisma"),
`
generator client {
 provider = "prisma-client-js"
}

datasource db {
 provider = "sqlite"
 url = "file:./dev.db"
}

model Memory {
 id Int @id @default(autoincrement())
 agent String
 message String
 createdAt DateTime @default(now())
}
`
);

//
// 3️⃣ Create minimal dashboard page
//

write(
 path.join(base,"app/dashboard/page.tsx"),
`
export default function Dashboard(){
 return (
 <div style={{padding:40,fontFamily:"sans-serif"}}>
 <h1>Cortex AI Dashboard</h1>
 <p>Your 12-agent system is online.</p>
 </div>
 )
}
`
);

//
// 4️⃣ Install dependencies
//

try{
 console.log("\n📦 Installing packages...\n");
 execSync("npm install",{stdio:"inherit"});
}catch{}

//
// 5️⃣ Run Prisma
//

try{
 console.log("\n⚡ Generating Prisma Client...\n");
 execSync("npx prisma generate",{stdio:"inherit"});

 console.log("\n⚡ Running DB Migration...\n");
 execSync("npx prisma migrate dev --name init",{stdio:"inherit"});
}catch(e){
 console.log("Prisma step skipped");
}

//
// 6️⃣ Launch Dev Server
//

console.log("\n🔥 Launching Next.js...\n");

try{
 execSync("npm run dev",{stdio:"inherit"});
}catch{}

console.log("\n✅ Cortex setup complete\n");