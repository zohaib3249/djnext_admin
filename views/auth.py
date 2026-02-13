"""
Authentication endpoints.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings as django_settings

from ..settings import djnext_settings

User = get_user_model()


class AuthViewSet(viewsets.ViewSet):
    """
    Authentication endpoints.
    """

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['login', 'refresh', 'password_reset_request', 'password_reset_confirm']:
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

        Refresh JWT token. When SIMPLE_JWT ROTATE_REFRESH_TOKENS is True,
        returns a new refresh token and blacklists the old one (if BLACKLIST_AFTER_ROTATION).
        """
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            old_refresh = RefreshToken(refresh_token)
            rotate = getattr(django_settings, 'SIMPLE_JWT', {}) and django_settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False)
            blacklist_after = getattr(django_settings, 'SIMPLE_JWT', {}) and django_settings.SIMPLE_JWT.get('BLACKLIST_AFTER_ROTATION', False)

            if rotate:
                user_id = old_refresh.get('user_id')
                if not user_id:
                    return Response({'error': 'Invalid refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
                user = User.objects.get(pk=user_id)
                new_refresh = RefreshToken.for_user(user)
                payload = {'access': str(new_refresh.access_token), 'refresh': str(new_refresh)}
                if blacklist_after:
                    try:
                        old_refresh.blacklist()
                    except Exception:
                        pass
                return Response(payload)
            payload = {'access': str(old_refresh.access_token)}
            return Response(payload)
        except ImportError:
            return Response(
                {'error': 'JWT authentication not configured.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception:
            return Response(
                {'error': 'Invalid refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def password_reset_request(self, request):
        """
        POST /api/{path}/auth/password-reset/

        Request: {"email": "user@example.com"}
        Sends reset email if account exists. Always returns 200 for security.
        """
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response(
                {'error': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = None
        if hasattr(User, 'EMAIL_FIELD') and User.EMAIL_FIELD:
            user = User.objects.filter(**{f'{User.EMAIL_FIELD}__iexact': email}).first()
        if not user and hasattr(User, 'username'):
            user = User.objects.filter(username__iexact=email).first()
        if user and user.is_active:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            frontend_url = getattr(django_settings, 'DJNEXT_FRONTEND_URL', None) or request.build_absolute_uri('/')
            reset_link = f'{frontend_url.rstrip("/")}/reset-password?uid={uid}&token={token}'
            subject = getattr(django_settings, 'DJNEXT_PASSWORD_RESET_SUBJECT', 'Password reset')
            body = getattr(
                django_settings,
                'DJNEXT_PASSWORD_RESET_BODY',
                f'Use this link to reset your password: {reset_link}'
            )
            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@localhost',
                    recipient_list=[getattr(user, 'email', None) or email],
                    fail_silently=True,
                )
            except Exception:
                pass
        return Response({'message': 'If an account exists with this email, you will receive a password reset link.'})

    def password_reset_confirm(self, request):
        """
        POST /api/{path}/auth/password-reset/confirm/

        Request: {"uid": "...", "token": "...", "new_password": "..."}
        """
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        if not uid or not token or not new_password:
            return Response(
                {'error': 'uid, token and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'error': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': 'Password has been reset. You can now sign in.'})

    def profile_update(self, request):
        """
        PATCH /api/{path}/auth/user/

        Request: {"first_name": "...", "last_name": "...", "email": "..."}
        """
        user = request.user
        data = request.data
        allowed = {'first_name', 'last_name', 'email'}
        updated = []
        for key in allowed:
            if key in data and hasattr(user, key):
                setattr(user, key, (data[key] or '').strip() if isinstance(data[key], str) else data[key])
                updated.append(key)
        if updated:
            user.save(update_fields=updated)
        return Response({
            'id': user.pk,
            'username': getattr(user, 'username', None) or getattr(user, 'email', ''),
            'email': getattr(user, 'email', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
        })

    def password_change(self, request):
        """
        POST /api/{path}/auth/password-change/

        Request: {"current_password": "...", "new_password": "..."}
        """
        current = request.data.get('current_password')
        new_password = request.data.get('new_password')
        if not current or not new_password:
            return Response(
                {'error': 'Current password and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = request.user
        if not user.check_password(current):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': 'Password has been updated.'})
