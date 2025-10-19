import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Minimal config
NOTION_TOKEN = os.getenv("NOTION_TOKEN")


def fetch_database(db_id, type) -> list:
    """Return list of results from a Notion database or an empty list."""
    if not (db_id and NOTION_TOKEN):
        return []

    # Notion API request headers and URL
    url = f"https://api.notion.com/v1/databases/{db_id}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }

    # Make the POST request to query the database
    resp = requests.post(url, headers=headers, json={})
    resp.raise_for_status()

    content = resp.json()["results"]

    output = []


    ### INCOMPLETE CLEAN HANDLER, CLEANUP NEEDED AND ERROR CHECKS ### --------------------------------------

    for a in content:
        props = a.get("properties", {})

        if type == "projects":
            item = {
                "Name": props.get("Name", {}).get("title", [{}])[0].get("plain_text", "") if props.get("Name", {}).get("title") else "",
                "Summary": props.get("Summary", {}).get("rich_text", [{}])[0].get("plain_text", "") if props.get("Summary", {}).get("rich_text") else "",
                "Tags": [tag.get("name", "") for tag in props.get("Tags", {}).get("multi_select", [])],
                "Image": props.get("Image", {}).get("files", [{}])[0].get("file", {}).get("url", "") if props.get("Image", {}).get("files") else "",
                "Date": props.get("Date", {}).get("date", {}).get("start", "") if props.get("Date", {}).get("date") else "",
                "Slug": props.get("Slug", {}).get("rich_text", [{}])[0].get("plain_text", "") if props.get("Slug", {}).get("rich_text") else "",
                "Link": props.get("Link", {}).get("url", "") if props.get("Link", {}) else "",
            }
        elif type == "education":
            item = {
                "Institution": props.get("Institution", {}).get("title", [{}])[0].get("plain_text", "") if props.get("Institution", {}).get("title") else "",
                "Program": props.get("Program", {}).get("rich_text", [{}])[0].get("plain_text", "") if props.get("Program", {}).get("rich_text") else "",
                "StartDate": props.get("StartDate", {}).get("date", {}).get("start", "") if props.get("StartDate", {}).get("date") else "",
                "EndDate": props.get("EndDate", {}).get("date", {}).get("start", "") if props.get("EndDate", {}).get("date") else "",
                "Description": props.get("Description", {}).get("rich_text", [{}])[0].get("plain_text", "") if props.get("Description", {}).get("rich_text") else "",
                "Link": props.get("Link", {}).get("url", "") if props.get("Link", {}) else "",

            }
        output.append(item)

    return output



if __name__ == "__main__":
    try:
        education = fetch_database(os.getenv("EDUCATION_DB_ID"), "education")
        print(education[0]["Institution"])
    except Exception as e:
        print(f"Error fetching education: {e}")