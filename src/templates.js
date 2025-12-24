export const templates = {
    tauri: `my-tauri-app/
├─ src/
│  ├─ main.rs [fn main() { println!("Hello from Rust!"); }]
│  └─ lib.rs
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx [import React from 'react';\\n\\nexport const App = () => <div>Hello Tauri</div>;]
│  │  └─ main.tsx
│  ├─ public/
│  ├─ package.json
│  └─ vite.config.ts
├─ src-tauri/
│  ├─ tauri.conf.json
│  └─ Cargo.toml
└─ README.md`,

    nextjs: `my-next-app/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx [export default function Page() { return <h1>Home</h1> }]
│  └─ api/
│     └─ hello/
│        └─ route.ts
├─ components/
│  └─ Header.tsx
├─ public/
│  ├─ favicon.ico
│  └─ vercel.svg
├─ next.config.js
├─ package.json
├─ tsconfig.json
└─ README.md`,

    fastapi: `my-api/
├─ app/
│  ├─ __init__.py
│  ├─ main.py [from fastapi import FastAPI\\n\\napp = FastAPI()\\n\\n@app.get("/")\\nasync def root():\\n    return {"message": "Hello World"}]
│  ├─ api/
│  │  ├─ __init__.py
│  │  └─ router.py
│  ├─ core/
│  │  └─ config.py
│  ├─ models/
│  └─ schemas/
├─ tests/
├─ .env
├─ Dockerfile
├─ requirements.txt
└─ README.md`,

    python_pkg: `my-package/
├─ my_package/
│  ├─ __init__.py
│  ├─ core.py
│  └─ utils.py
├─ tests/
│  ├─ __init__.py
│  └─ test_core.py
├─ docs/
├─ setup.py [from setuptools import setup, find_packages\\n\\nsetup(name='my_package', version='0.1', packages=find_packages())]
├─ LICENSE
└─ README.md`,

    vite_vanilla: `vite-project/
├─ src/
│  ├─ main.js [import './style.css';\\n\\ndocument.querySelector('#app').innerHTML = '<h1>Hello Vite!</h1>';]
│  ├─ counter.js
│  └─ style.css
├─ public/
│  └─ vite.svg
├─ index.html
├─ package.json
└─ README.md`
};
