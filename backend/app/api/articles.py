from fastapi import APIRouter
from app.routers import articles

router = APIRouter()
router.include_router(articles.router)
