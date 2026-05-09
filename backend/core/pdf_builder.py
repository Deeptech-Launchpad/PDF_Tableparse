# backend/core/pdf_builder.py
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import os

def generate_pdf_from_json(data, output_path, template_path=None):
    """
    Generates a professional PDF table from the provided JSON structure.
    Optional template_path can be used as a background image.
    """
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.pdfgen import canvas
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors

    # Determine page size
    pagesize = landscape(A4)
    width, height = pagesize

    def draw_background(canv, doc):
        if template_path and os.path.exists(template_path):
            canv.saveState()
            canv.drawImage(template_path, 0, 0, width=width, height=height)
            canv.restoreState()

    doc = SimpleDocTemplate(output_path, pagesize=pagesize, 
                            rightMargin=50, leftMargin=50, 
                            topMargin=150 if template_path else 30, 
                            bottomMargin=50)
    elements = []
    styles = getSampleStyleSheet()

    # Section Title Style
    title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.black if template_path else colors.white,
        backColor=None if template_path else colors.HexColor("#D32F2F"), # Red
        alignment=0, # Left
        spaceAfter=12
    )

    # Add Title
    elements.append(Paragraph(data.get("section", "Data Table"), title_style))
    elements.append(Spacer(1, 0.1 * inch))

    # Prepare Table Data
    table_data = []
    if data.get("headers"):
        table_data.append(data["headers"])
    
    if data.get("rows"):
        table_data.extend(data["rows"])

    if not table_data:
        return False

    # Create Table
    available_width = width - 100
    col_count = len(table_data[0])
    col_widths = [available_width / col_count] * col_count

    t = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Styling the Table
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F5F5DC")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
    ])
    t.setStyle(style)

    elements.append(t)

    # Build PDF with background hook
    doc.build(elements, onFirstPage=draw_background, onLaterPages=draw_background)
    return True
