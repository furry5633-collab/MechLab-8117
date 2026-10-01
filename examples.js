// ============================================================================
// Ejemplos de código precargados
// ============================================================================
const CODE_EXAMPLES = {
  cpp: [
    {
      name: 'Sensor controla motor (ejemplo base)',
      code: `const int sensor = 2;
const int motor = 9;

void setup() {
  pinMode(sensor, INPUT);
  pinMode(motor, OUTPUT);
}

void loop() {
  if (digitalRead(sensor) == HIGH) {
    analogWrite(motor, 180);
  } else {
    analogWrite(motor, 0);
  }
}`,
    },
    {
      name: 'Parpadeo de LED (Blink)',
      code: `const int led = 13;

void setup() {
  pinMode(led, OUTPUT);
}

void loop() {
  digitalWrite(led, HIGH);
  delay(500);
  digitalWrite(led, LOW);
  delay(500);
}`,
    },
    {
      name: 'Lectura analógica + Serial',
      code: `const int sensorPin = 0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int valor = analogRead(sensorPin);
  Serial.println(valor);
  delay(200);
}`,
    },
    {
      name: 'Servo controlado por sensor de distancia',
      code: `const int sensor = 0;
const int servoPin = 9;

void setup() {
  pinMode(servoPin, OUTPUT);
}

void loop() {
  int dist = analogRead(sensor);
  int angulo = map(dist, 0, 1023, 0, 255);
  analogWrite(servoPin, angulo);
  delay(50);
}`,
    },
  ],
  python: [
    {
      name: 'MicroPython — parpadeo LED',
      code: `from machine import Pin
import time

led = Pin(2, Pin.OUT)

while True:
    led.value(1)
    time.sleep(0.5)
    led.value(0)
    time.sleep(0.5)`,
    },
    {
      name: 'MicroPython — sensor controla salida',
      code: `from machine import Pin
import time

sensor = Pin(2, Pin.IN)
motor = Pin(9, Pin.OUT)

while True:
    if sensor.value() == 1:
        motor.value(1)
    else:
        motor.value(0)
    time.sleep(0.1)`,
    },
    {
      name: 'Raspberry Pi — RPi.GPIO',
      code: `import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.OUT)

while True:
    GPIO.output(17, True)
    time.sleep(1)
    GPIO.output(17, False)
    time.sleep(1)`,
    },
  ],
};
