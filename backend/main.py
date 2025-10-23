from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timedelta
import os

from garmin_service import GarminService

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Garmin Data API", version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局Garmin服务实例
garmin_service = GarminService()

class LoginRequest(BaseModel):
    email: str
    password: str

class SyncRequest(BaseModel):
    days: Optional[int] = 7
    force: Optional[bool] = False

@app.post("/api/garmin/login")
async def login(request: LoginRequest):
    """Garmin登录接口"""
    try:
        success = await garmin_service.login(request.email, request.password)
        if success:
            return {"success": True, "message": "登录成功"}
        else:
            raise HTTPException(status_code=401, detail="登录失败，请检查用户名和密码")
    except Exception as e:
        logger.error(f"登录错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"登录错误: {str(e)}")

@app.get("/api/garmin/sync")
async def sync_data(days: int = 7, force: bool = False):
    """同步Garmin数据接口"""
    try:
        data = await garmin_service.sync_data(days=days, force=force)
        return {
            "success": True,
            "data": data,
            "message": f"成功同步{len(data)}天的数据"
        }
    except Exception as e:
        logger.error(f"同步数据错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"同步数据错误: {str(e)}")

@app.get("/api/garmin/user")
async def get_user_info():
    """获取用户信息接口"""
    try:
        user_info = await garmin_service.get_user_info()
        return {"success": True, "data": user_info}
    except Exception as e:
        logger.error(f"获取用户信息错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取用户信息错误: {str(e)}")

@app.get("/api/garmin/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)