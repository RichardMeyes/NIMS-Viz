FROM python:3.6-slim

COPY ./static/backend /app/static/backend
COPY ./static/data /app/static/data
COPY ./static/frontend/dist /app/static/frontend/dist

COPY ./main.py /app/main.py
COPY ./requirements.txt /app/requirements.txt

WORKDIR /app

RUN apt-get update
RUN apt-get install -y libglib2.0-0 libsm6 libgtk2.0-dev
RUN pip install -r requirements.txt

RUN chmod 644 main.py

CMD ["python", "main.py"]