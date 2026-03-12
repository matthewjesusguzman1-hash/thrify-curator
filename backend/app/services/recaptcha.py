import httpx
import os
from typing import Optional

# reCAPTCHA configuration
RECAPTCHA_SECRET_KEY = os.environ.get('RECAPTCHA_SECRET_KEY', '')
RECAPTCHA_THRESHOLD = float(os.environ.get('RECAPTCHA_THRESHOLD', '0.5'))
RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


async def verify_recaptcha_token(
    token: str,
    expected_action: str = 'contact_form_submit',
    remote_ip: Optional[str] = None
) -> dict:
    """
    Verify a reCAPTCHA v3 token with Google's verification service.
    
    Args:
        token: The reCAPTCHA response token from the frontend
        expected_action: The action name that should match the frontend action
        remote_ip: Optional user IP address for additional verification
        
    Returns:
        dict with 'success', 'score', 'action' keys
        
    Raises:
        ValueError: If verification fails or token is invalid
    """
    if not RECAPTCHA_SECRET_KEY:
        # If no secret key configured, skip verification (development mode)
        print("WARNING: RECAPTCHA_SECRET_KEY not set, skipping verification")
        return {'success': True, 'score': 1.0, 'action': expected_action, 'skipped': True}
    
    payload = {
        'secret': RECAPTCHA_SECRET_KEY,
        'response': token
    }
    
    if remote_ip:
        payload['remoteip'] = remote_ip
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(RECAPTCHA_VERIFY_URL, data=payload)
            response.raise_for_status()
    except httpx.TimeoutException:
        raise ValueError('reCAPTCHA verification service timeout. Please try again.')
    except httpx.HTTPError as e:
        raise ValueError(f'reCAPTCHA verification service error: {str(e)}')
    
    result = response.json()
    
    # Check if verification was successful
    if not result.get('success'):
        error_codes = result.get('error-codes', [])
        raise ValueError(f'reCAPTCHA verification failed: {", ".join(error_codes)}')
    
    # Check the action matches (if provided in response)
    if result.get('action') and result.get('action') != expected_action:
        raise ValueError(
            f'Action mismatch: expected {expected_action}, got {result.get("action")}'
        )
    
    # Check score against threshold
    score = result.get('score', 0.0)
    if score < RECAPTCHA_THRESHOLD:
        raise ValueError(
            f'reCAPTCHA score too low: {score:.2f} (threshold: {RECAPTCHA_THRESHOLD})'
        )
    
    return {
        'success': True,
        'score': score,
        'action': result.get('action', expected_action),
        'hostname': result.get('hostname', ''),
        'challenge_ts': result.get('challenge_ts', '')
    }
