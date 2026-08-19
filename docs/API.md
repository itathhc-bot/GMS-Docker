# API Documentation

openapi: 3.1.0
info:
  title: Garage Guardian API
  version: 1.0.0
servers:
  - url: /api/v1
    description: V1 API
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

paths:
  /login:
    post:
      summary: User Login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
                device_name:
                  type: string
      responses:
        '200':
          description: Successful login
        '401':
          description: Invalid credentials
          
  /logout:
    post:
      summary: User Logout
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Logged out
          
  /me:
    get:
      summary: Get authenticated user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User details
          
  /vehicles:
    get:
      summary: List vehicles
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Vehicles list
    post:
      summary: Create vehicle
      security:
        - bearerAuth: []
      responses:
        '201':
          description: Vehicle created
          
  /job-cards:
    get:
      summary: List job cards
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Job cards list
    post:
      summary: Create job card
      security:
        - bearerAuth: []
      responses:
        '201':
          description: Job card created
