import requests
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

def send_slack_message(text: str, channel: str = None):
    """Send Slack notification via webhook"""
    try:
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        
        if not webhook_url:
            logger.warning("Slack webhook URL not configured, skipping Slack notification")
            return False
        
        payload = {
            "text": text
        }
        
        if channel:
            payload["channel"] = channel
        
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        
        logger.info("Slack message sent successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send Slack message: {e}")
        return False
