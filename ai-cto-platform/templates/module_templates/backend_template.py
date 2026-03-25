from fastapi import APIRouter

router = APIRouter()

@router.{{HTTP_METHOD}}("{{ROUTE_PATH}}")
def {{FUNCTION_NAME}}({{PARAMS_SIGNATURE}}):
    {{BODY}}

