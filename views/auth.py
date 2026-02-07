"""
Authentication endpoints.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout

from ..settings import djnext_settings


class AuthViewSet(viewsets.ViewSet):
    """
    Authentication endpoints.
    """

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['login', 'refresh']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def login(self, request):
        """
        POST /api/{path}/auth/login/

        Request:
            {"username": "admin@example.com", "password": "password"}
            or
            {"email": "admin@example.com", "password": "password"}

        Response:
            {"user": {...}, "tokens": {...}}
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Support both 'username' and 'email' as identifier
        identifier = request.data.get('username') or request.data.get('email')
        password = request.data.get('password')

        if not identifier or not password:
            return Response(
                {'error': 'Username/email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate using the User model's USERNAME_FIELD
        username_field = User.USERNAME_FIELD
        credentials = {username_field: identifier, 'password': password}
        user = authenticate(request, **credentials)

        if not user:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'User account is disabled.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if djnext_settings.REQUIRE_STAFF and not user.is_staff:
            return Response(
                {'error': 'Staff access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Login (creates session)
        login(request, user)

        response_data = {
            'user': {
                'id': user.pk,
                'username': getattr(user, 'username', None) or getattr(user, 'email', ''),
                'email': getattr(user, 'email', ''),
                'first_name': getattr(user, 'first_name', ''),
                'last_name': getattr(user, 'last_name', ''),
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff,
            },
            'message': 'Login successful.',
        }

        # Add JWT tokens if available
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            response_data['tokens'] = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        except ImportError:
            pass

        return Response(response_data)

    def logout(self, request):
        """
        POST /api/{path}/auth/logout/
        """
        logout(request)
        return Response({'message': 'Logged out successfully.'})

    def user(self, request):
        """
        GET /api/{path}/auth/user/

        Returns current user info.
        """
        user = request.user

        return Response({
            'id': user.pk,
            'username': getattr(user, 'username', None) or getattr(user, 'email', ''),
            'email': getattr(user, 'email', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'date_joined': user.date_joined.isoformat() if hasattr(user, 'date_joined') and user.date_joined else None,
            'last_login': user.last_login.isoformat() if hasattr(user, 'last_login') and user.last_login else None,
        })

    def refresh(self, request):
        """
        POST /api/{path}/auth/refresh/

        Refresh JWT token.
        """
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken(refresh_token)
            return Response({
                'access': str(refresh.access_token),
            })
        except ImportError:
            return Response(
                {'error': 'JWT authentication not configured.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception:
            return Response(
                {'error': 'Invalid refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
