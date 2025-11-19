# After School Classes Web App

## Project Overview
This is a full stack web application for buying after-school classes and activities. The frontend is built with Vue.js and the backend is built with Node.js, Express.js, and MongoDB Atlas.

---

## Links

- [Vue.js App GitHub Repository](https://github.com/obdaguy-create/STUDENT_PARENTS_AFTER_SCHOOL_LESSONS_FRONTEND)
- [Vue.js App GitHub Pages (Live Demo)](https://obdaguy-create.github.io/STUDENT_PARENTS_AFTER_SCHOOL_LESSONS_FRONTEND/)
- [Express.js App GitHub Repository](https://github.com/obdaguy-create/STUDENT_PARENTS_AFTER_SCHOOL_LESSONS_BACKEND)
- [Express.js App Render/AWS (Live API)](http://schooltest-env.eba-kjdsk8eq.ap-south-1.elasticbeanstalk.com/)

---

## How to Run Locally

### Frontend (Vue.js)
1. Open the `FRONTEND` folder.
2. Open `index.html` in your browser.

### Backend (Express.js)
1. Open the `SERVER` folder.
2. Run `npm install` to install dependencies.
3. Run `node server.js` to start the server.
4. The backend will connect to MongoDB Atlas and listen on port 8080 by default.

---

## MongoDB Collections
- Exported `Lessons` and `Orders` collections are included in the submission zip.

## Database Seeding

- The `seed.js` script in the `SERVER` folder is used to populate the MongoDB Atlas database with the initial lessons data.
- To run the script, use:
	```
	node seed.js
	```
- MongoDB Compass (desktop app) was used to connect to MongoDB Atlas (cloud) for data management and exporting collections.

## Postman Requests
- Exported Postman collection for all API endpoints is included in the submission zip.

---

## Features Checklist
- Vue.js frontend with Bootstrap and Font Awesome
- Express.js backend with native MongoDB driver
- REST API: GET /lessons, GET /search, POST /orders, PUT /lessons/:id
- Full-text search (search as you type)
- Shopping cart and checkout with validation
- Logger and static file/image middleware

---

## Author
- Name: MICHAEL MBU
- Student ID: M00886180
- Module: CST3144 Full Stack Development 2024-25

---

**Please replace all <...> placeholders with your actual links and information before submission.**
