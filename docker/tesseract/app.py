from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import io
import os
import subprocess

app = Flask(__name__)

@app.route('/ocr', methods=['POST'])
def ocr():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    try:
        # Preprocessing can be done here using PIL or ImageMagick
        image = Image.open(io.BytesIO(file.read()))
        
        # Extract text
        text = pytesseract.image_to_string(image, lang='eng+ara')
        
        # Extract confidence data
        data = pytesseract.image_to_data(image, lang='eng+ara', output_type=pytesseract.Output.DICT)
        confidences = [int(conf) for conf in data['conf'] if int(conf) >= 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return jsonify({
            'text': text.strip(),
            'confidence': avg_confidence
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
