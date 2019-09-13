FROM python:3.6-slim

WORKDIR /backend/
COPY ./ /backend/

RUN apt-get update
RUN apt-get install -y libglib2.0-0 libsm6 libgtk2.0-dev libssl-dev
RUN pip install -r requirements.txt

RUN chmod 644 main.py

CMD ["python", "main.py"]