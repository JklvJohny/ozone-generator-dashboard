import logging
import sys

def setup_logger(name: str) -> logging.Logger:
    """
    Configures and returns a standard logger.
    """
    logger = logging.getLogger(name)
    
    # Prevent duplicate logs if the logger is already configured
    if logger.hasHandlers():
        return logger
        
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    
    return logger

# Create a root logger instance that parts of the app can easily import
app_logger = setup_logger("ozone_api")
