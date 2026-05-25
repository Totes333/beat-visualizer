#!/bin/bash

# 1. Start Python Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 &
BACKEND_PID=$!

# 2. Start Frontend UI
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

# 3. Handle closing all tasks together on exit
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait