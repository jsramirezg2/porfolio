from flask import Flask, render_template
from dotenv import load_dotenv
import os
from services.notion_api import fetch_database

# Load environment variables
load_dotenv()

PROJECTS_DB_ID = os.getenv("PROJECTS_DB_ID")
BLOG_DB_ID = os.getenv("BLOG_DB_ID")
EDUCATION_DB_ID = os.getenv("EDUCATION_DB_ID")

# Create Flask application
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Routes
@app.route('/')
def index():
    projects = fetch_database(PROJECTS_DB_ID, "projects")
    education = fetch_database(EDUCATION_DB_ID, "education")
    return render_template('index.html', projects=projects, education=education)

if __name__ == '__main__':
    # Development server
    app.run(debug=True)
