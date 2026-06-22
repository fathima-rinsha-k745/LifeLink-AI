from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import RegisterSerializer


@extend_schema(
    request=RegisterSerializer,
    responses={201: None},
    auth=[],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message": "User registered successfully"},
            status=201
        )

    return Response(serializer.errors, status=400)


@extend_schema(
    auth=[],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(
        username=username,
        password=password
    )

    if user is not None:
        return Response(
            {"message": "Login successful"},
            status=200
        )

    return Response(
        {"message": "Invalid username or password"},
        status=400
    )