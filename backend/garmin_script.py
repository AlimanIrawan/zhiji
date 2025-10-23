#!/usr/bin/env python3
import sys
import json
import asyncio
from garmin_service import GarminService

async def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
    
    action = sys.argv[1]
    params = json.loads(sys.argv[2])
    
    service = GarminService()
    
    try:
        if action == "login":
            result = await service.login(params["email"], params["password"])
            print(json.dumps({"success": result}))
        
        elif action == "sync":
            days = params.get("days", 7)
            force = params.get("force", False)
            data = await service.sync_data(days=days, force=force)
            print(json.dumps({"data": data}))
        
        elif action == "user_info":
            user_info = await service.get_user_info()
            print(json.dumps({"user_info": user_info}))
        
        else:
            print(json.dumps({"error": "Unknown action"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())