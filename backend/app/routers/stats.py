"""站点访问统计 API"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Visit
from ..schemas import VisitCreate

router = APIRouter()


@router.post("/stats/visit", status_code=201)
def record_visit(payload: VisitCreate, db: Session = Depends(get_db)):
    """记录一次页面访问（前端每个浏览器会话上报一次，刷新不重复计数）"""
    db.add(Visit(visitor_id=payload.visitor_id, path=payload.path))
    db.commit()
    return {"ok": True}


@router.get("/stats/summary")
def stats_summary(db: Session = Depends(get_db)):
    """访问量（PV，总记录数）与访客量（UV，按 visitor_id 去重）"""
    pv = db.scalar(select(func.count()).select_from(Visit)) or 0
    uv = db.scalar(select(func.count(func.distinct(Visit.visitor_id)))) or 0
    return {"pv": pv, "uv": uv}
