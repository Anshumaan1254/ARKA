from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import base64
import numpy as np
import cv2
from io import BytesIO
from PIL import Image
import os
import httpx

router = APIRouter()

AZURE_VISION_ENDPOINT = os.getenv("AZURE_VISION_ENDPOINT", "")
AZURE_VISION_KEY = os.getenv("AZURE_VISION_KEY", "")

COMMON_ITEMS = ["keys", "remote", "phone", "wallet", "glasses", "watch", "bag", "book", "medicine", "cup", "bottle"]

class ObjectDetectionRequest(BaseModel):
    image_base64: str
    detect_items: Optional[List[str]] = None

def decode_base64_image(base64_str: str) -> bytes:
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    return base64.b64decode(base64_str)

async def detect_objects_azure(image_bytes: bytes) -> dict:
    if not AZURE_VISION_ENDPOINT or not AZURE_VISION_KEY:
        return {"objects": [], "mock": True}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{AZURE_VISION_ENDPOINT}/vision/v3.2/detect",
            headers={
                "Ocp-Apim-Subscription-Key": AZURE_VISION_KEY,
                "Content-Type": "application/octet-stream"
            },
            content=image_bytes,
            timeout=30.0
        )
        if response.status_code == 200:
            return response.json()
        return {"objects": [], "error": response.text}

def detect_objects_local(image_bytes: bytes) -> list:
    img = Image.open(BytesIO(image_bytes))
    img_array = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    objects = []
    for i, contour in enumerate(contours[:20]):
        area = cv2.contourArea(contour)
        if area > 500:
            x, y, w, h = cv2.boundingRect(contour)
            objects.append({
                "object": f"object_{i+1}",
                "confidence": 0.5,
                "rectangle": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
            })
    return objects

@router.post("/detect")
async def detect_objects(request: ObjectDetectionRequest):
    try:
        image_bytes = decode_base64_image(request.image_base64)
        
        azure_result = await detect_objects_azure(image_bytes)
        
        if azure_result.get("mock") or azure_result.get("error"):
            local_objects = detect_objects_local(image_bytes)
            return {
                "objects": local_objects,
                "source": "local",
                "message": "Using local detection (Azure not configured)"
            }
        
        objects = azure_result.get("objects", [])
        
        if request.detect_items:
            objects = [o for o in objects if any(item.lower() in o.get("object", "").lower() for item in request.detect_items)]
        
        return {
            "objects": objects,
            "source": "azure",
            "objectCount": len(objects)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ItemSearchRequest(BaseModel):
    image_base64: str
    item_name: str

@router.post("/find-item")
async def find_item(request: ItemSearchRequest):
    try:
        image_bytes = decode_base64_image(request.image_base64)
        azure_result = await detect_objects_azure(image_bytes)
        
        objects = azure_result.get("objects", [])
        item_lower = request.item_name.lower()
        
        matching_objects = []
        for obj in objects:
            obj_name = obj.get("object", "").lower()
            if item_lower in obj_name or obj_name in item_lower:
                matching_objects.append(obj)
        
        found = len(matching_objects) > 0
        
        return {
            "found": found,
            "itemName": request.item_name,
            "matches": matching_objects,
            "allObjects": [o.get("object") for o in objects],
            "message": f"Found {len(matching_objects)} instance(s) of '{request.item_name}'" if found else f"'{request.item_name}' not found in image"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/common-items")
async def get_common_items():
    return {"items": COMMON_ITEMS}
