import requests
import time
import random


url = "https://api.powerbi.com/beta/6e2715f6-e83b-4e2c-949f-77018fd5edd8/datasets/200e4ebe-3097-4e94-8678-12dc434d9963/rows?experience=power-bi&key=ZXaZu0mmiiCKWMNiY7fmTu%2F9ow5Kv2mBFZ%2FRIsrm0P9IMOI2EMeDy72ihIS9NTc3jww9yrMkY0IZC2WNjfY4Ag%3D%3D"


data = {
    "region": "East",
    "sales": 0,
    "timestamp": "2025-09-22T12:34:56Z"
}

for i in range(10):
    data["sales"] = data["sales"] + random.random() * 10 - (random.random() * 3)
    data["timestamp"] = f"2025-09-22T12:35:{10+i}Z"
    requests.post(url, json=[data])
    
    print(data)

    time.sleep(2)
