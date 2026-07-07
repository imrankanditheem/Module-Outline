// ============================================
// RIGHT PANE FUNCTIONALITY
// ============================================

// State management
let currentOutlineId = null;
let outlines = JSON.parse(localStorage.getItem('moduleOutlines') || '[]');
let pdfOutlines = JSON.parse(localStorage.getItem('modulePDFs') || '[]');
let isFirstSave = true;

// Initialize the outlines list
document.addEventListener('DOMContentLoaded', function () {
    loadOutlinesList();
});

// Function to validate all required fields before export
function validateFormBeforeExport() {
    const missingSections = [];

    // Module Name (English) is optional for PDF export

    // Check Module Description
    const moduleDescription = document.querySelector('[name="module_description"]')?.value?.trim();
    if (!moduleDescription) {
        missingSections.push("Module Description");
    }

    // Check 11.2 Module Level (MNQF)
    const moduleLevel = document.querySelector('[name="module_level"]')?.value;
    if (!moduleLevel || parseInt(moduleLevel) < 1 || parseInt(moduleLevel) > 10) {
        missingSections.push("11.2 Module Level (MNQF)");
    }

    // Check 11.3 Credits
    const credits = document.querySelector('[name="contact_credits"]')?.value;
    if (!credits || parseFloat(credits) <= 0) {
        missingSections.push("11.3 Number of Credits");
    }

    // Check 11.4 Delivery Modality (at least one mode selected)
    const deliveryModes = document.querySelectorAll('input[name="delivery_mode"]:checked');
    if (deliveryModes.length === 0) {
        missingSections.push("11.4 Delivery Modality (Mode)");
    }

    // Check 11.5 Minimum Qualification
    const instructorQualification = document.querySelector('[name="instructor_qualification"]')?.value?.trim();
    if (!instructorQualification) {
        missingSections.push("11.5 Minimum Qualification");
    }

    // Check 11.8 Expected Learning Outcomes (at least one outcome with text)
    let hasOutcome = false;
    const outcomeTextareas = document.querySelectorAll('#outcomesBody textarea');
    for (const textarea of outcomeTextareas) {
        if (textarea.value.trim()) {
            hasOutcome = true;
            break;
        }
    }
    if (!hasOutcome) {
        missingSections.push("11.8 Expected Learning Outcomes");
    }

    // Check 11.9 Curricular Content (at least one topic)
    let hasTopic = false;
    const topicInputs = document.querySelectorAll('#curricularBody input[name^="topic"]');
    for (const input of topicInputs) {
        if (input.value.trim()) {
            hasTopic = true;
            break;
        }
    }
    if (!hasTopic) {
        missingSections.push("11.9 Curricular Content");
    }

    // Check 11.10 Assessment Methods (at least one assessment with weight)
    let hasAssessment = false;
    const weightInputs = document.querySelectorAll('#assessmentBody .weight-input');
    for (const input of weightInputs) {
        if (input.value && parseFloat(input.value) > 0) {
            hasAssessment = true;
            break;
        }
    }
    if (!hasAssessment) {
        missingSections.push("11.10 Assessment Methods");
    }

    // Check 11.11 Reference Materials (Core Texts)
    const coreTexts = document.querySelector('[name="core_texts"]')?.value?.trim();
    if (!coreTexts) {
        missingSections.push("11.11 Reference Materials (Core Texts)");
    }

    // Check Developed By section
    const developerName = document.querySelector('[name="developer_name"]')?.value?.trim();
    if (!developerName) {
        missingSections.push("Developed By: Full Name");
    }

    const qualification = document.querySelector('[name="qualification"]')?.value?.trim();
    if (!qualification) {
        missingSections.push("Developed By: Highest Qualification");
    }

    const designation = document.querySelector('[name="designation"]')?.value?.trim();
    if (!designation) {
        missingSections.push("Developed By: Designation and Office");
    }

    const emailContact = document.querySelector('[name="email_contact"]')?.value?.trim();
    if (!emailContact) {
        missingSections.push("Developed By: Email ID");
    }

    return missingSections;
}

function getEnteredFormFieldCount() {
    const form = document.getElementById('moduleForm');
    if (!form) return 0;

    const fields = form.querySelectorAll('input, textarea, select');
    let filledCount = 0;

    fields.forEach(field => {
        if (field.disabled || field.readOnly || field.type === 'hidden') return;

        if (field.type === 'checkbox' || field.type === 'radio') {
            if (field.checked) filledCount += 1;
            return;
        }

        if (field.tagName === 'SELECT') {
            if (field.dataset.userChanged === 'true') filledCount += 1;
            return;
        }

        if (String(field.value || '').trim()) {
            filledCount += 1;
        }
    });

    return filledCount;
}

function hasEnteredFormData() {
    return getEnteredFormFieldCount() > 0;
}

function notifyMissingFormData(actionLabel) {
    showNotification(`Please fill the form before you ${actionLabel}.`, 'warning');
}

function notifyMissingRequiredFields(actionLabel, missingSections) {
    const count = missingSections.length;
    const sectionText = count === 1 ? 'required section is' : 'required sections are';
    showNotification(`${count} ${sectionText} missing before you ${actionLabel}.`, 'warning');
}

// Function to create a new outline
function createNewOutline() {
    if (confirm('Create a new outline? Any unsaved changes will be lost.')) {
        document.getElementById('moduleForm').reset();
        resetFormToInitialState();
        currentOutlineId = null;
        isFirstSave = true;
        document.getElementById('outlinesPreview').classList.remove('active');
        showNotification('New outline created successfully!', 'success');
    }
}

// Function to save a draft
function saveDraft() {
    if (!hasEnteredFormData()) {
        notifyMissingFormData('save a draft');
        return;
    }

    if (currentOutlineId && !isFirstSave) {
        showNotification('Outline Saved', 'success');
        updateExistingOutline();
        return;
    }
    document.getElementById('saveModal').classList.add('active');
}

// Function to show saved outlines
function showMyOutlines() {
    const previewPane = document.getElementById('outlinesPreview');
    previewPane.classList.toggle('active');
    if (previewPane.classList.contains('active')) {
        loadOutlinesList();
    }
}

// Function to open export modal with validation
function openExportModal() {
    if (!hasEnteredFormData()) {
        notifyMissingFormData('export the outline');
        return;
    }

    // Validate form before showing export modal
    const missingSections = validateFormBeforeExport();

    if (missingSections.length > 0) {
        // Show validation warning modal instead of export modal
        notifyMissingRequiredFields('export the outline', missingSections);
        showValidationWarning(missingSections);
        return;
    }

    // Check if there's any data to export
    const formData = collectFormData();
    const moduleName = formData.module_name_en || 'Untitled Module';
    const moduleCode = formData.module_code || 'No Code';

    if (!moduleName && !moduleCode) {
        showNotification('Please fill in some data before exporting', 'warning');
        return;
    }

    // Set default export name
    const defaultName = `${moduleCode} - ${moduleName}`;
    document.getElementById('exportTitle').value = defaultName;

    // Show export modal
    document.getElementById('exportModal').classList.add('active');
}

// Function to show validation warning modal
function showValidationWarning(missingSections) {
    const validationList = document.getElementById('validationList');
    validationList.innerHTML = '';

    missingSections.forEach(section => {
        const div = document.createElement('div');
        div.className = 'validation-item';
        div.innerHTML = `<strong>${section}</strong>`;
        validationList.appendChild(div);
    });

    document.getElementById('validationModal').classList.add('active');
}

// Function to close validation modal
function closeValidationModal() {
    document.getElementById('validationModal').classList.remove('active');
}

// Function to confirm export
function confirmExport() {
    const exportName = document.getElementById('exportTitle').value.trim();

    if (!exportName) {
        alert('Please enter a name for the PDF file.');
        return;
    }

    closeModal();
    exportToPDF(exportName);
}

function sanitizeFilename(value) {
    const cleaned = String(value || '')
        .trim()
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();

    return `${cleaned || 'module_outline'}.pdf`;
}

function getDeliveryModesText(data) {
    return (data.delivery_modes || []).map(mode => {
        if (mode === 'f2f') return 'Face to Face';
        if (mode === 'blended') return 'Blended';
        if (mode === 'elearning') return 'E-Learning';
        return String(mode || '');
    }).filter(Boolean).join(', ');
}

function cleanPDFText(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\r\n/g, '\n').trim();
}

function createModuleOutlinePDF(data) {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const topMargin = 16;
    const headerHeight = 16;
    const bottomMargin = 20;
    const tableWidth = pageWidth - (marginX * 2);
    const colWidths = [18, 50, tableWidth - 68];
    const rowFill = [238, 238, 238];
    const labelFill = [248, 248, 248];
    const sectionFill = [55, 55, 55];
    const headerFill = [224, 224, 224];
    const lineColor = [0, 0, 0];
    const bodyFontSize = 10;
    const innerFontSize = 7.8;
    const bodyLineHeight = 4.7;
    const innerLineHeight = 3.5;
    const paddingX = 2.2;
    const paddingY = 2.2;
    let y = topMargin + headerHeight;

    function addHeader() {
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text('MODULE OUTLINE FORM', marginX, topMargin - 5);
        doc.setDrawColor(...lineColor);
        doc.setLineWidth(0.35);
        doc.line(marginX, topMargin + 4, pageWidth - marginX, topMargin + 4);
    }

    doc.setProperties({
        title: cleanPDFText(data.module_name_en) || 'Module Outline',
        subject: 'Module Outline',
        creator: 'Module Outline Form'
    });
    doc.setLineWidth(0.2);
    doc.setDrawColor(...lineColor);

    function setBodyFont(style = 'normal') {
        doc.setFont('times', style);
        doc.setFontSize(bodyFontSize);
        doc.setTextColor(0, 0, 0);
    }

    function setInnerFont(style = 'normal') {
        doc.setFont('times', style);
        doc.setFontSize(innerFontSize);
        doc.setTextColor(0, 0, 0);
    }

    function splitLines(text, width, isInner = false) {
        const parts = cleanPDFText(text).split('\n');
        const lines = [];
        if (isInner) {
            setInnerFont();
        } else {
            setBodyFont();
        }

        parts.forEach(part => {
            const wrapped = doc.splitTextToSize(part || ' ', Math.max(width, 2));
            if (wrapped.length) {
                lines.push(...wrapped);
            } else {
                lines.push('');
            }
        });

        return lines.length ? lines : [''];
    }

    function ensurePageSpace(height) {
        if (y + height <= pageHeight - bottomMargin) return;
        if (y <= topMargin + 0.1) return;
        doc.addPage();
        addHeader();
        y = topMargin + headerHeight;
    }

    function drawFilledCell(x, yPos, width, height, fill) {
        doc.setDrawColor(...lineColor);
        doc.setFillColor(...fill);
        doc.setLineWidth(0.2);
        doc.rect(x, yPos, width, height, 'FD');
    }

    function drawTextLines(lines, x, yPos, width, height, style = 'normal', isInner = false, align = 'left') {
        if (isInner) {
            setInnerFont(style);
        } else {
            setBodyFont(style);
        }

        const lineHeight = isInner ? innerLineHeight : bodyLineHeight;
        const textX = align === 'center' ? x + (width / 2) : x + paddingX;
        let textY = yPos + paddingY + (isInner ? 2.2 : 3.4);

        lines.forEach(line => {
            doc.text(String(line), textX, textY, { align });
            textY += lineHeight;
        });
    }

    function drawTextRow(sectionNo, label, value) {
        const valueLines = splitLines(value, colWidths[2] - (paddingX * 2));
        let firstChunk = true;
        let remaining = valueLines.slice();

        while (remaining.length || firstChunk) {
            const sectionLines = splitLines(firstChunk ? sectionNo : '', colWidths[0] - (paddingX * 2));
            const labelLines = splitLines(firstChunk ? label : '', colWidths[1] - (paddingX * 2));
            const availableHeight = pageHeight - bottomMargin - y;
            const maxValueLines = Math.max(1, Math.floor((availableHeight - (paddingY * 2)) / bodyLineHeight));
            const chunkLines = remaining.length ? remaining.splice(0, maxValueLines) : [''];
            let rowHeight = Math.max(sectionLines.length, labelLines.length, chunkLines.length) * bodyLineHeight + (paddingY * 2);
            rowHeight = Math.max(rowHeight, 10);

            if (rowHeight > availableHeight && y > topMargin) {
                remaining = chunkLines.concat(remaining);
                doc.addPage();
                addHeader();
                y = topMargin + headerHeight;
                continue;
            }

            const x0 = marginX;
            const x1 = x0 + colWidths[0];
            const x2 = x1 + colWidths[1];
            drawFilledCell(x0, y, colWidths[0], rowHeight, rowFill);
            drawFilledCell(x1, y, colWidths[1], rowHeight, labelFill);
            drawFilledCell(x2, y, colWidths[2], rowHeight, [255, 255, 255]);
            drawTextLines(sectionLines, x0, y, colWidths[0], rowHeight, 'bold', false, 'center');
            drawTextLines(labelLines, x1, y, colWidths[1], rowHeight, 'bold');
            drawTextLines(chunkLines, x2, y, colWidths[2], rowHeight);
            y += rowHeight;
            firstChunk = false;
        }
    }

    function getInnerRowHeight(cells, widths, isHeader = false) {
        const lineCounts = cells.map((cell, index) => {
            if (isHeader) setInnerFont('bold');
            const lines = splitLines(cell, widths[index] - 2, true);
            return lines.length;
        });
        return Math.max(7, Math.max(...lineCounts) * innerLineHeight + 3);
    }

    function drawInnerTable(x, yPos, widths, headers, rows) {
        let currentY = yPos;
        const headerHeight = getInnerRowHeight(headers, widths, true);
        let currentX = x;

        headers.forEach((header, index) => {
            drawFilledCell(currentX, currentY, widths[index], headerHeight, headerFill);
            drawTextLines(splitLines(header, widths[index] - 2, true), currentX, currentY, widths[index], headerHeight, 'bold', true, 'center');
            currentX += widths[index];
        });
        currentY += headerHeight;

        rows.forEach(row => {
            const rowHeight = getInnerRowHeight(row, widths);
            currentX = x;
            row.forEach((cell, index) => {
                drawFilledCell(currentX, currentY, widths[index], rowHeight, [255, 255, 255]);
                const align = index === 0 || cell === 'X' ? 'center' : 'left';
                drawTextLines(splitLines(cell, widths[index] - 2, true), currentX, currentY, widths[index], rowHeight, 'normal', true, align);
                currentX += widths[index];
            });
            currentY += rowHeight;
        });
    }

    function chunkRowsForPage(headers, rows, widths, labelLines, sectionLines, startIndex) {
        const availableHeight = pageHeight - bottomMargin - y;
        const headerHeight = getInnerRowHeight(headers, widths, true);
        const labelHeight = Math.max(sectionLines.length, labelLines.length) * bodyLineHeight + (paddingY * 2);
        let usedHeight = headerHeight;
        const chunk = [];
        let index = startIndex;

        while (index < rows.length) {
            const rowHeight = getInnerRowHeight(rows[index], widths);
            if (usedHeight + rowHeight > availableHeight && chunk.length > 0) break;
            if (usedHeight + rowHeight > availableHeight && y > topMargin) break;
            usedHeight += rowHeight;
            chunk.push(rows[index]);
            index += 1;
        }

        if (!chunk.length && index < rows.length && y > topMargin) {
            return { rows: [], height: 0, nextIndex: index };
        }

        return {
            rows: chunk.length ? chunk : [headers.map((_, headerIndex) => headerIndex === 0 ? 'No information entered.' : '')],
            height: Math.max(usedHeight, labelHeight, 10),
            nextIndex: index
        };
    }

    function drawNestedTableRow(sectionNo, label, headers, rows, widths) {
        let index = 0;
        let firstChunk = true;
        const tableRows = rows.length
            ? rows
            : [headers.map((_, headerIndex) => headerIndex === 0 ? 'No information entered.' : '')];

        while (index < tableRows.length) {
            const sectionLines = splitLines(firstChunk ? sectionNo : '', colWidths[0] - (paddingX * 2));
            const labelLines = splitLines(firstChunk ? label : '', colWidths[1] - (paddingX * 2));
            const chunk = chunkRowsForPage(headers, tableRows, widths, labelLines, sectionLines, index);

            if (!chunk.rows.length) {
                doc.addPage();
                addHeader();
                y = topMargin + headerHeight;
                continue;
            }

            ensurePageSpace(chunk.height);
            const x0 = marginX;
            const x1 = x0 + colWidths[0];
            const x2 = x1 + colWidths[1];
            drawFilledCell(x0, y, colWidths[0], chunk.height, rowFill);
            drawFilledCell(x1, y, colWidths[1], chunk.height, labelFill);
            drawFilledCell(x2, y, colWidths[2], chunk.height, [255, 255, 255]);
            drawTextLines(sectionLines, x0, y, colWidths[0], chunk.height, 'bold', false, 'center');
            drawTextLines(labelLines, x1, y, colWidths[1], chunk.height, 'bold');
            drawInnerTable(x2, y, widths, headers, chunk.rows);
            y += chunk.height;
            index = chunk.nextIndex;
            firstChunk = false;
        }
    }

    function drawSectionHeader(title) {
        ensurePageSpace(9);
        doc.setFillColor(...sectionFill);
        doc.setDrawColor(...lineColor);
        doc.rect(marginX, y, tableWidth, 8, 'FD');
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), marginX + 2.5, y + 5.3);
        doc.setTextColor(0, 0, 0);
        y += 8;
    }

    function drawTitleBlock() {
        addHeader();
        y = topMargin + headerHeight;

        doc.setDrawColor(...lineColor);
        doc.setLineWidth(0.35);
        doc.rect(marginX, y, tableWidth, 34);

        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text('Module Outline', pageWidth / 2, y + 10, { align: 'center' });

        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.text('Islamic University of Maldives', pageWidth / 2, y + 18, { align: 'center' });
        if (data.programme_name) {
            doc.setFontSize(10);
            doc.text(data.programme_name, pageWidth / 2, y + 27, { align: 'center' });
        }
        y += 38;
    }

    function addFooterToAllPages() {
        const totalPages = doc.internal.getNumberOfPages();
        for (let page = 1; page <= totalPages; page++) {
            doc.setPage(page);
            doc.setFont('times', 'normal');
            doc.setFontSize(9);
            doc.text(`Page ${page} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        }
    }

    data.module_name_en = cleanPDFText(data.module_name_en);
    data.module_name_dhivehi = cleanPDFText(data.module_name_dhivehi);
    data.module_name_arabic = cleanPDFText(data.module_name_arabic);
    data.programme_name = cleanPDFText(data.programme_name);

    function supportsPdfText(value) {
        return /^[\x00-\x7F\n\r\t]*$/.test(value || '');
    }

    if (!supportsPdfText(data.module_name_dhivehi)) {
        data.module_name_dhivehi = '';
    }
    if (!supportsPdfText(data.module_name_arabic)) {
        data.module_name_arabic = '';
    }

    const deliveryModes = getDeliveryModesText(data);
    const moduleLevel = [data.module_level, mnqfLevels[data.module_level]].filter(Boolean).join(' ');
    const outcomesRows = (data.outcomes || []).map(outcome => {
        const cells = outcome.competencies.map(c => c.checked ? 'X' : '');
        return [
            outcome.number || '',
            outcome.text || '',
            cells[0] || '',
            cells[1] || '',
            cells[2] || '',
            cells[3] || '',
            cells[4] || ''
        ];
    });
    const curricularRows = (data.curricular_content || []).map(item => [
        item.week || '',
        [item.topic, item.details].filter(Boolean).join('\n'),
        item.pedagogy || '',
        item.resources || '',
        item.credit || '',
        item.hours || '',
        item.contact || ''
    ]);
    const assessmentRows = (data.assessments || []).map((assessment, index) => [
        String(index + 1),
        assessment.title || '',
        assessment.details || '',
        assessment.form || '',
        assessment.length || '',
        assessment.weight || ''
    ]);
    const controlledWeight = data.assessments?.reduce((sum, item) => sum + (item.form === 'Uncontrolled' ? 0 : parseFloat(item.weight || 0)), 0) || 0;
    const uncontrolledWeight = data.assessments?.reduce((sum, item) => sum + (item.form === 'Uncontrolled' ? parseFloat(item.weight || 0) : 0), 0) || 0;
    const totalWeight = controlledWeight + uncontrolledWeight;

    drawTitleBlock();
    drawSectionHeader('11.1 Module Identification');
    drawTextRow('11.1', 'Module Name (English)', data.module_name_en);
    drawTextRow('', 'Module Name (Dhivehi)', data.module_name_dhivehi);
    drawTextRow('', 'Module Name (Arabic)', data.module_name_arabic);
    drawTextRow('', 'Module Description', data.module_description);
    drawSectionHeader('11.2 Module Code and Level');
    drawTextRow('11.2', 'Module Code', data.module_code);
    drawTextRow('', 'Module Level', moduleLevel);
    drawSectionHeader('11.3 Credit and Hours Distribution');
    drawTextRow('11.3', 'Credits', data.contact_credits);
    drawTextRow('', 'Total Learning Hours', data.contact_total_learning_hours);
    drawTextRow('', 'Contact Hours (Face to Face, Blended Mode & E-Learning)', data.contact_hours);
    drawTextRow('', 'Non-contact Hours (Face to face, Blended and E-Learning Mode)', data.non_contact_hours);
    drawSectionHeader('11.4 Delivery Modality');
    drawTextRow('11.4', 'Delivery Modality', deliveryModes);
    drawTextRow('', 'Methods of Delivery', data.delivery_methods);
    drawSectionHeader('11.5 to 11.7 Entry Requirements');
    drawTextRow('11.5', 'Minimum Qualification', data.instructor_qualification);
    drawTextRow('11.6', 'Prerequisite', data.prerequisite);
    drawTextRow('11.7', 'Corequisites', data.corequisites);
    drawSectionHeader('11.8 Expected Learning Outcomes');
    drawNestedTableRow(
        '11.8',
        'Expected Learning Outcomes',
        ['No.', 'Outcome Statement', 'Knowledge & Understanding', 'Practice', 'Generic Cognitive Skills', 'Communication, ICT & Numeracy', 'Autonomy & Accountability'],
        outcomesRows,
        [8, 34, 12, 11, 13, 14, 14]
    );
    drawSectionHeader('11.9 Curricular Content');
    drawNestedTableRow(
        '11.9',
        'Curricular Content',
        ['Week', 'Main Topic & Details', 'Pedagogy', 'Resources', 'Credit', 'TLH', 'Contact'],
        curricularRows,
        [8, 36, 16, 16, 9, 10, 11]
    );
    drawSectionHeader('11.10 Assessment Methods and Grading');
    drawNestedTableRow(
        '11.10',
        'Assessment Methods and Grading',
        ['#', 'Task Title', 'Details', 'Form', 'Length', 'Weight (%)'],
        assessmentRows,
        [7, 22, 34, 16, 13, 14]
    );
    drawTextRow('', 'Assessment Weightage Summary', `Total Weightage: ${totalWeight}%\nControlled Assessment Weightage: ${controlledWeight}%\nUncontrolled Assessment Weightage: ${uncontrolledWeight}%`);
    drawSectionHeader('11.11 Reference Materials');
    drawTextRow('11.11', 'Core Texts', data.core_texts);
    drawTextRow('', 'Additional References', data.additional_references);
    drawSectionHeader('Developed By');
    drawTextRow('Developed By', 'Full Name', data.developer_name);
    drawTextRow('', 'Highest Qualification', data.qualification);
    drawTextRow('', 'Designation and Office', data.designation);
    drawTextRow('', 'Email ID', data.email_contact);
    ensurePageSpace(26);
    y += 6;
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.text('Developer Signature:', marginX, y);
    doc.line(marginX + 34, y + 1, marginX + 82, y + 1);
    doc.text('Date:', pageWidth - marginX - 52, y);
    doc.line(pageWidth - marginX - 40, y + 1, pageWidth - marginX, y + 1);
    y += 12;
    doc.text('Approved By:', marginX, y);
    doc.line(marginX + 24, y + 1, marginX + 82, y + 1);
    doc.text('Date:', pageWidth - marginX - 52, y);
    doc.line(pageWidth - marginX - 40, y + 1, pageWidth - marginX, y + 1);
    addFooterToAllPages();

    return doc;
}

async function exportToPDF(customName, sourceData, saveRecord = true) {
    if (!window.jspdf?.jsPDF) {
        showNotification('PDF tools are unavailable. Opening print dialog instead.', 'warning');
        window.print();
        return;
    }

    showNotification('Generating PDF…', 'info');
    const formData = sourceData || collectFormData();
    const finalFilename = sanitizeFilename(customName);

    try {
        // Prefer HTML->canvas->PDF path to preserve complex script rendering (Arabic/Thaana)
        if (window.html2canvas) {
            await renderPdfFromHtml(formData, finalFilename);
        } else {
            const doc = createModuleOutlinePDF(formData);
            doc.save(finalFilename);
        }

        if (saveRecord) {
            const pdfRecord = {
                id: `pdf_${Date.now()}`,
                title: customName,
                moduleCode: formData.module_code || 'Untitled',
                moduleName: formData.module_name_en || 'Untitled Module',
                timestamp: new Date().toISOString(),
                filename: finalFilename,
                data: formData,
                type: 'pdf'
            };

            pdfOutlines.unshift(pdfRecord);
            localStorage.setItem('modulePDFs', JSON.stringify(pdfOutlines));
        }

        showNotification('PDF exported successfully!', 'success');
        if (document.getElementById('outlinesPreview').classList.contains('active')) {
            loadOutlinesList();
        }
    } catch (err) {
        console.error('PDF Export Error:', err);
        showNotification('Failed to export PDF', 'error');
    }
}

// Build HTML for the hidden PDF template and render using html2canvas + jsPDF
async function renderPdfFromHtml(data, filename) {
        const docEl = document.getElementById('pdfDocument');
        docEl.innerHTML = buildPdfTemplateHtml(data);
        docEl.style.display = 'block';

        // ensure fonts are loaded before rendering
        try {
                if (document.fonts && document.fonts.ready) {
                        await document.fonts.ready;
                }
        } catch (e) {
                // ignore font loading errors
        }

        // give browser a tick to apply fonts/styles
        await new Promise(r => setTimeout(r, 160));

        const canvas = await html2canvas(docEl, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                scrollY: -window.scrollY,
                windowWidth: docEl.scrollWidth,
                windowHeight: docEl.scrollHeight
        });

        const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12;
        const imgWidth = pageWidth - margin * 2;
        const pageHeightLimit = pageHeight - margin * 2;
        const pageHeightPx = Math.floor(canvas.width * pageHeightLimit / imgWidth);

        let position = 0;
        let pageIndex = 0;

        while (position < canvas.height) {
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                const remainingHeight = canvas.height - position;
                pageCanvas.height = remainingHeight > pageHeightPx ? pageHeightPx : remainingHeight;

                const pageCtx = pageCanvas.getContext('2d');
                pageCtx.fillStyle = '#ffffff';
                pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                pageCtx.drawImage(canvas, 0, position, canvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);

                const pageData = pageCanvas.toDataURL('image/png', 1.0);
                const pageImageHeight = (pageCanvas.height * imgWidth) / canvas.width;

                if (pageIndex > 0) {
                        pdf.addPage();
                }
                pdf.addImage(pageData, 'PNG', margin, margin, imgWidth, pageImageHeight);

                position += pageCanvas.height;
                pageIndex += 1;
        }

        pdf.save(filename);
}

// Build the HTML string for the PDF document using the application form structure
function buildPdfTemplateHtml(data) {
        const d = Object.assign({}, data);
        const safe = v => (v === null || v === undefined) ? '' : String(v);
        const textToHtml = value => escapeHtml(safe(value)).replace(/\n/g, '<br/>');
        const multilineValue = value => `<div class="pdf-value-multiline">${textToHtml(value) || '&nbsp;'}</div>`;
        const checkboxMark = checked => checked ? '&#10004;' : '&nbsp;';

        const renderSectionHeading = (section, title) => `
                <div class="pdf-section-title">
                        <div class="pdf-section-number">${escapeHtml(section)}</div>
                        <div class="pdf-section-heading">${escapeHtml(title)}</div>
                </div>`;

        const renderFieldRow = (label, value, rtl = false) => `
                <tr>
                        <td class="pdf-label-cell"><strong>${escapeHtml(label)}</strong></td>
                        <td class="pdf-value-cell${rtl ? ' pdf-rtl' : ''}">${rtl ? `<div dir="rtl">${textToHtml(value) || '&nbsp;'}</div>` : multilineValue(value)}</td>
                </tr>`;

        const renderNameBlock = () => `
                <table class="pdf-name-table">
                        <tbody>
                                <tr>
                                        <td class="pdf-name-field"><strong>English Name:</strong></td>
                                        <td class="pdf-name-field"><strong>Dhivehi Name:</strong></td>
                                        <td class="pdf-name-field"><strong>Arabic Name:</strong></td>
                                </tr>
                                <tr>
                                        <td class="pdf-name-value">${multilineValue(d.module_name_en)}</td>
                                        <td class="pdf-name-value pdf-rtl" dir="rtl">${textToHtml(d.module_name_dhivehi) || '&nbsp;'}</td>
                                        <td class="pdf-name-value pdf-rtl" dir="rtl">${textToHtml(d.module_name_arabic) || '&nbsp;'}</td>
                                </tr>
                        </tbody>
                </table>`;

        const renderOutcomeTable = () => {
                const outcomes = (d.outcomes && d.outcomes.length) ? d.outcomes : [{ text: '', competencies: [] }];
                const rows = outcomes.map((outcome, idx) => {
                        const competencies = outcome.competencies || [];
                        return `
                                <tr>
                                        <td>${escapeHtml(outcome.number || idx + 1)}</td>
                                        <td>${multilineValue(outcome.text)}</td>
                                        <td class="pdf-checkbox-cell">${checkboxMark(competencies[0]?.checked)}</td>
                                        <td class="pdf-checkbox-cell">${checkboxMark(competencies[1]?.checked)}</td>
                                        <td class="pdf-checkbox-cell">${checkboxMark(competencies[2]?.checked)}</td>
                                        <td class="pdf-checkbox-cell">${checkboxMark(competencies[3]?.checked)}</td>
                                        <td class="pdf-checkbox-cell">${checkboxMark(competencies[4]?.checked)}</td>
                                </tr>`;
                }).join('');

                return `
                        <table class="pdf-section-table pdf-competency-table">
                                <thead>
                                        <tr>
                                                <th class="pdf-row-number-header">#</th>
                                                <th class="pdf-outcome-statement-header">Outcome Statement</th>
                                                <th class="pdf-competency-header"><span class="pdf-vertical-label">Knowledge &amp;<br>understanding</span></th>
                                                <th class="pdf-competency-header"><span class="pdf-vertical-label">Practice: Applied<br>Knowledge and Understanding</span></th>
                                                <th class="pdf-competency-header"><span class="pdf-vertical-label">Generic Cognitive<br>Skills</span></th>
                                                <th class="pdf-competency-header"><span class="pdf-vertical-label">Communication, ICT<br>and Numeracy Skills</span></th>
                                                <th class="pdf-competency-header"><span class="pdf-vertical-label">Autonomy, Accountability<br>and Working with Others</span></th>
                                        </tr>
                                </thead>
                                <tbody>${rows}</tbody>
                        </table>`;
        };

        const renderCurricularRows = () => {
                const rows = (d.curricular_content && d.curricular_content.length) ? d.curricular_content : [{ topic: '', details: '', pedagogy: '', resources: '', credit: '', hours: '', contact: '' }];
                return rows.map((row, idx) => `
                        <tr>
                                <td class="pdf-center-cell">${idx + 1}</td>
                                <td>${multilineValue(row.topic)}${row.details ? `<div style="margin-top:6px; font-size:9pt; color:#444;">${textToHtml(row.details)}</div>` : ''}</td>
                                <td>${multilineValue(row.pedagogy)}</td>
                                <td>${multilineValue(row.resources)}</td>
                                <td class="pdf-center-cell">${escapeHtml(row.credit)}</td>
                                <td class="pdf-center-cell">${escapeHtml(row.hours)}</td>
                                <td class="pdf-center-cell">${escapeHtml(row.contact)}</td>
                        </tr>`).join('');
        };

        const renderAssessmentRows = () => {
                const rows = (d.assessments && d.assessments.length) ? d.assessments : [{ title: '', details: '', form: '', length: '', weight: '' }];
                return rows.map((assessment, idx) => `
                        <tr>
                                <td class="pdf-center-cell">${idx + 1}</td>
                                <td>${multilineValue(assessment.title)}</td>
                                <td>${multilineValue(assessment.details)}</td>
                                <td class="pdf-center-cell">${escapeHtml(assessment.form)}</td>
                                <td class="pdf-center-cell">${escapeHtml(assessment.length)}</td>
                                <td class="pdf-center-cell">${escapeHtml(assessment.weight)}</td>
                        </tr>`).join('');
        };

        let html = `
                <div class="pdf-container">
                        <div class="pdf-header">
                                <div class="pdf-document-title">Module Outline</div>
                                <div class="pdf-document-subtitle">Islamic University of Maldives</div>
                                <div class="pdf-programme-name">${textToHtml(d.programme_name)}</div>
                        </div>

                        ${renderSectionHeading('11.1', 'Module Name')}
                        ${renderNameBlock()}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Module Description', d.module_description)}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.2', 'Module Code')}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Module Code', d.module_code)}
                                        ${renderFieldRow('Module Level (MNQF)', d.module_level ? `MNQF level: ${escapeHtml(d.module_level)}` : '')}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.3', 'Credit & Hours Distribution')}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Number of Credits', d.contact_credits)}
                                        ${renderFieldRow('Total Learning Hours', d.contact_total_learning_hours)}
                                        ${renderFieldRow('Contact Hours', d.contact_hours)}
                                        ${renderFieldRow('Non-contact Hours', d.non_contact_hours)}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.4', 'Delivery Modality')}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Mode', getDeliveryModesText(d))}
                                        ${renderFieldRow('Methods of Delivery', d.delivery_methods)}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.5', 'Minimum Qualification')}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Instructor Qualification', d.instructor_qualification)}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.6', 'Prerequisite')}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Prerequisite', d.prerequisite)}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.7', 'Corequisites')}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Corequisites', d.corequisites)}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.8', 'Expected Learning Outcomes')}
                        ${renderOutcomeTable()}

                        ${renderSectionHeading('11.9', 'Curricular Content')}
                        <table class="pdf-section-table pdf-curricular-table">
                                <thead>
                                        <tr>
                                                <th>Week</th>
                                                <th>Main Topic &amp; Details</th>
                                                <th>Pedagogy</th>
                                                <th>Resources</th>
                                                <th class="pdf-curricular-credit-header"><span>Credit</span></th>
                                                <th>Total Learning Hours</th>
                                                <th>Contact Hours</th>
                                        </tr>
                                </thead>
                                <tbody>${renderCurricularRows()}</tbody>
                        </table>

                        ${renderSectionHeading('11.10', 'Assessment Methods and Grading')}
                        <div style="margin-bottom:8px; font-size:10pt; color:#333;">Students must obtain 50% from all controlled assessments to pass. In E-learning and Blended modality all exams are conducted face-to-face under supervision of invigilators.</div>
                        <table class="pdf-section-table pdf-assessment-table">
                                <thead>
                                        <tr>
                                                <th>#</th>
                                                <th>Task Title</th>
                                                <th>Details</th>
                                                <th>Form</th>
                                                <th>Length (Words)</th>
                                                <th>Weight (%)</th>
                                        </tr>
                                </thead>
                                <tbody>${renderAssessmentRows()}</tbody>
                        </table>
                        <table class="pdf-key-table" style="margin-top:6px;">
                                <tbody>
                                        ${renderFieldRow('Controlled Assessment Weightage', d.assessment_controlled_weight ? `${escapeHtml(d.assessment_controlled_weight)}%` : '')}
                                        ${renderFieldRow('Uncontrolled Assessment Weightage', d.assessment_uncontrolled_weight ? `${escapeHtml(d.assessment_uncontrolled_weight)}%` : '')}
                                        ${renderFieldRow('Total Weightage', d.assessment_total_weight ? `${escapeHtml(d.assessment_total_weight)}%` : '')}
                                </tbody>
                        </table>

                        ${renderSectionHeading('11.11', 'Reference Materials')}
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Core Texts', d.core_texts)}
                                        ${renderFieldRow('Additional References', d.additional_references)}
                                </tbody>
                        </table>

                        <div class="pdf-section-title" style="margin-top:16px;">
                                <div class="pdf-section-number">-</div>
                                <div class="pdf-section-heading">Developed By</div>
                        </div>
                        <table class="pdf-key-table">
                                <tbody>
                                        ${renderFieldRow('Full Name', d.developer_name)}
                                        ${renderFieldRow('Highest Qualification', d.qualification)}
                                        ${renderFieldRow('Designation and Office', d.designation)}
                                        ${renderFieldRow('Email ID', d.email_contact)}
                                </tbody>
                        </table>
                </div>`;

        return html;
}

function escapeHtml(str) {
        return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
}

// Function to download PDF
function downloadPDF(pdfId) {
    const pdfRecord = pdfOutlines.find(pdf => pdf.id === pdfId);
    if (pdfRecord) {
        showNotification(`Downloading ${pdfRecord.filename}...`, 'info');
        exportToPDF(pdfRecord.title, pdfRecord.data, false);
    }
}

// Expose key functions to the global/window scope so inline `onclick` handlers work
// Some environments wrap scripts; explicit exposure ensures the buttons can call them.
/* moved global exposures to end of file */

// Function to close modal
function closeModal() {
    document.getElementById('saveModal').classList.remove('active');
    document.getElementById('loadModal').classList.remove('active');
    document.getElementById('exportModal').classList.remove('active');
}

// Function to confirm save (first time save)
function confirmSave() {
    const title = document.getElementById('outlineTitle').value.trim();

    if (!title) {
        alert('Please enter a title for the outline.');
        return;
    }

    const formData = collectFormData();
    const outline = {
        id: currentOutlineId || Date.now().toString(),
        title: title,
        moduleCode: formData.module_code || 'Untitled',
        moduleName: formData.module_name_en || 'Untitled Module',
        timestamp: new Date().toISOString(),
        data: formData,
        type: 'draft'
    };

    const existingIndex = outlines.findIndex(o => o.id === outline.id);
    if (existingIndex !== -1) {
        outlines[existingIndex] = outline;
    } else {
        outlines.unshift(outline);
    }

    localStorage.setItem('moduleOutlines', JSON.stringify(outlines));
    currentOutlineId = outline.id;
    isFirstSave = false;
    closeModal();
    document.getElementById('outlineTitle').value = '';
    loadOutlinesList();
    showNotification('Outline saved successfully!', 'success');
}

// Function to update an existing outline without showing modal
function updateExistingOutline() {
    if (!currentOutlineId) return;

    const outlineIndex = outlines.findIndex(o => o.id === currentOutlineId);
    if (outlineIndex === -1) return;

    const formData = collectFormData();
    outlines[outlineIndex].data = formData;
    outlines[outlineIndex].moduleCode = formData.module_code || 'Untitled';
    outlines[outlineIndex].moduleName = formData.module_name_en || 'Untitled Module';
    outlines[outlineIndex].timestamp = new Date().toISOString();

    localStorage.setItem('moduleOutlines', JSON.stringify(outlines));
    loadOutlinesList();
}

// Function to load an outline
function loadOutline(id) {
    const outline = outlines.find(o => o.id === id);
    if (!outline) {
        alert('Outline not found.');
        return;
    }

    window.outlineToLoad = outline;
    document.getElementById('loadModal').classList.add('active');
}

// Function to confirm loading an outline
function confirmLoad() {
    const outline = window.outlineToLoad;

    if (!outline) {
        closeModal();
        return;
    }

    loadFormData(outline.data);
    currentOutlineId = outline.id;
    isFirstSave = false;
    closeModal();
    document.getElementById('outlinesPreview').classList.remove('active');
    showNotification(`Outline "${outline.title}" loaded successfully!`, 'success');
    window.outlineToLoad = null;

    setTimeout(() => {
        if (document.getElementById('creditsInput').value) {
            calculateHours();
        }
    }, 100);
}

// Function to delete an outline
function deleteOutline(id, event) {
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this outline?')) {
        // Check if it's a draft or PDF
        if (id.startsWith('pdf_')) {
            pdfOutlines = pdfOutlines.filter(o => o.id !== id);
            localStorage.setItem('modulePDFs', JSON.stringify(pdfOutlines));
        } else {
            outlines = outlines.filter(o => o.id !== id);

            if (currentOutlineId === id) {
                document.getElementById('moduleForm').reset();
                currentOutlineId = null;
                isFirstSave = true;
                resetFormToInitialState();
            }

            localStorage.setItem('moduleOutlines', JSON.stringify(outlines));
        }

        loadOutlinesList();
        showNotification('Outline deleted successfully!', 'success');
    }
}

// Function to load the outlines list with categories
function loadOutlinesList() {
    const listContainer = document.getElementById('outlinesList');

    // Filter drafts and PDFs
    const drafts = outlines.filter(item => !item.type || item.type === 'draft');
    const exported = pdfOutlines;

    let html = '';

    // Drafts section
    html += '<div class="outline-category">';
    html += '<div class="category-title">Drafts</div>';

    if (drafts.length === 0) {
        html += '<div class="empty-state">No draft outlines saved yet.</div>';
    } else {
        drafts.forEach(item => {
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            html += `
            <div class="outline-item" onclick="loadOutline('${item.id}')">
              <div class="outline-title">
                <i class="fas fa-file-alt" style="color: var(--secondary-color); margin-right: 5px;"></i>
                ${item.title}
              </div>
              <div class="outline-meta">
                <span>${item.moduleCode}</span>
                <span>${dateStr} ${timeStr}</span>
              </div>
              <div style="margin-top: 5px; font-size: 0.85em; color: #888;">
                ${item.moduleName}
              </div>
              <div class="outline-actions">
                <button class="outline-action-btn btn-delete" onclick="deleteOutline('${item.id}', event)">
                  <i class="fas fa-trash-alt"></i> Delete
                </button>
              </div>
            </div>
          `;
        });
    }
    html += '</div>';

    // Exported Outlines section
    html += '<div class="outline-category">';
    html += '<div class="category-title">Exported Outlines</div>';

    if (exported.length === 0) {
        html += '<div class="empty-state">No exported PDFs yet.</div>';
    } else {
        exported.forEach(item => {
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            html += `
            <div class="outline-item">
              <div class="outline-title">
                <i class="fas fa-file-pdf" style="color: #d9534f; margin-right: 5px;"></i>
                ${item.title}
              </div>
              <div class="outline-meta">
                <span>${item.moduleCode}</span>
                <span>${dateStr} ${timeStr}</span>
              </div>
              <div style="margin-top: 5px; font-size: 0.85em; color: #888;">
                ${item.moduleName}
              </div>
              <div class="outline-actions">
                <button class="outline-action-btn btn-download" onclick="downloadPDF('${item.id}')">
                  <i class="fas fa-download"></i> Download PDF
                </button>
                <button class="outline-action-btn btn-delete" onclick="deleteOutline('${item.id}', event)">
                  <i class="fas fa-trash-alt"></i> Delete
                </button>
              </div>
            </div>
          `;
        });
    }
    html += '</div>';

    listContainer.innerHTML = html;
}

// Function to collect all form data
function collectFormData() {
    const form = document.getElementById('moduleForm');
    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }

    const deliveryModes = [];
    document.querySelectorAll('input[name="delivery_mode"]:checked').forEach(cb => {
        deliveryModes.push(cb.value);
    });
    data.delivery_modes = deliveryModes;

    const outcomes = [];
    const outcomeRows = document.querySelectorAll('#outcomesBody tr');
    outcomeRows.forEach((row, index) => {
        const textarea = row.querySelector('textarea');
        const checkboxes = Array.from(row.querySelectorAll('input[type="checkbox"]')).map((cb, idx) => ({
            name: ['Knowledge & understanding', 'Practice: Applied Knowledge and Understanding', 'Generic Cognitive Skills', 'Communication, ICT and Numeracy Skills', 'Autonomy, Accountability and Working with Others'][idx],
            checked: cb.checked
        }));
        if (textarea && textarea.value.trim()) {
            outcomes.push({
                text: textarea.value,
                number: index + 1,
                competencies: checkboxes
            });
        }
    });
    data.outcomes = outcomes;

    const curricularContent = [];
    const curricularRows = document.querySelectorAll('#curricularBody tr');
    curricularRows.forEach((row, index) => {
        const week = index + 1;
        const topic = row.querySelector('input[name^="topic"]')?.value || '';
        const details = row.querySelector('textarea[name^="details"]')?.value || '';
        const pedagogy = row.querySelector('textarea[name^="pedagogy"]')?.value || '';
        const resources = row.querySelector('textarea[name^="resources"]')?.value || '';
        const credit = row.querySelector('input[name^="credit"]')?.value || '';
        const hours = row.querySelector('input[name^="hours"]')?.value || '';
        const contact = row.querySelector('input[name^="contact"]')?.value || '';

        if (topic || details || pedagogy || resources || credit || hours || contact) {
            curricularContent.push({
                week,
                topic,
                details,
                pedagogy,
                resources,
                credit,
                hours,
                contact
            });
        }
    });
    data.curricular_content = curricularContent;

    const assessments = [];
    const assessmentRows = document.querySelectorAll('#assessmentBody tr');
    assessmentRows.forEach((row, index) => {
        const title = row.querySelector('textarea[name^="assessment"]')?.value || '';
        const details = row.querySelectorAll('textarea[name^="assessment"]')[1]?.value || '';
        const form = row.querySelector('select[name^="assessment"]')?.value || '';
        const length = row.querySelector('input[name$="_length"]')?.value || '';
        const weight = row.querySelector('input[name$="_weight"]')?.value || '';

        if (title || details || form || length || weight) {
            assessments.push({
                title,
                details,
                form,
                length,
                weight
            });
        }
    });
    data.assessments = assessments;

    data.assessment_total_weight = parseFloat(document.getElementById('totalWeight')?.value || 0);
    data.assessment_controlled_weight = parseFloat(document.getElementById('controlledTotal')?.innerText || 0);
    data.assessment_uncontrolled_weight = parseFloat(document.getElementById('uncontrolledTotal')?.innerText || 0);

    return data;
}

// Function to load form data
function loadFormData(data) {
    const form = document.getElementById('moduleForm');
    form.reset();
    resetFormToInitialState();

    Object.keys(data).forEach(key => {
        if (key === 'delivery_modes' || key === 'outcomes' || key === 'curricular_content' || key === 'assessments') {
            return;
        }

        const element = form.querySelector(`[name="${key}"]`);
        if (element) {
            element.value = data[key] || '';
        }
    });

    if (data.delivery_modes) {
        document.querySelectorAll('input[name="delivery_mode"]').forEach(cb => {
            cb.checked = data.delivery_modes.includes(cb.value);
        });
        updateDeliveryMethods();
    }

    if (data.outcomes && data.outcomes.length > 0) {
        const outcomesBody = document.getElementById('outcomesBody');
        outcomesBody.innerHTML = '';

        data.outcomes.forEach((outcome, index) => {
            const competencies = outcome.competencies || [];
            const checkedMarkup = idx => competencies[idx]?.checked ? 'checked' : '';
            if (index === 0) {
                outcomesBody.innerHTML = `
              <tr>
                <td>
                  <div class="outcome-input-wrapper">
                    <span class="outcome-number">1.</span>
                    <textarea name="outcome1" rows="2">${outcome.text || ''}</textarea>
                  </div>
                </td>
                <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(0)}></td>
                <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(1)}></td>
                <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(2)}></td>
                <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(3)}></td>
                <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(4)}></td>
              </tr>
            `;
            } else {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
              <td>
                <div class="outcome-input-wrapper">
                  <span class="outcome-number">${index + 1}.</span>
                  <textarea name="outcome${index + 1}" rows="2">${outcome.text || ''}</textarea>
                </div>
              </td>
              <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(0)}></td>
              <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(1)}></td>
              <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(2)}></td>
              <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(3)}></td>
              <td class="checkbox-cell"><input type="checkbox" ${checkedMarkup(4)}></td>
            `;
                outcomesBody.appendChild(newRow);
            }
        });
    }

    if (data.curricular_content && data.curricular_content.length > 0) {
        const curricularBody = document.getElementById('curricularBody');
        curricularBody.innerHTML = '';

        data.curricular_content.forEach((item, index) => {
            if (index === 0) {
                curricularBody.innerHTML = `
              <tr>
                <td style="text-align:center; font-weight:bold; background-color:#f9f9f9; vertical-align: middle;">
                  <span class="week-display">1</span>
                </td>
                <td>
                  <div class="vertical-input-group">
                    <label style="font-size: 0.8em; color: #666;">Main Topic:</label>
                    <input type="text" name="topic1" placeholder="Enter Main Topic" value="${item.topic || ''}">

                    <label style="font-size: 0.8em; color: #666;">Details:</label>
                    <textarea name="details1" style="height:60px" placeholder="Enter Details">${item.details || ''}</textarea>
                  </div>
                </td>
                <td><textarea name="pedagogy1" style="height:100%">${item.pedagogy || ''}</textarea></td>
                <td><textarea name="resources1" style="height:100%">${item.resources || ''}</textarea></td>
                <td><input type="text" name="credit1" class="curr-credit-field" readonly style="background-color:#fff; text-align:center; min-width:40px;"></td>
                <td><input type="number" name="hours1" class="curr-hours-field" readonly></td>
                <td><input type="number" name="contact1" class="curr-contact-field" readonly></td>
              </tr>
            `;
            } else {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
              <td style="text-align:center; font-weight:bold; background-color:#f9f9f9; vertical-align: middle;">
                <span class="week-display">${index + 1}</span>
              </td>
              <td>
                <div class="vertical-input-group">
                  <label style="font-size: 0.8em; color: #666;">Main Topic:</label>
                  <input type="text" name="topic${index + 1}" placeholder="Enter Main Topic" value="${item.topic || ''}">

                  <label style="font-size: 0.8em; color: #666;">Details:</label>
                  <textarea name="details${index + 1}" style="height:60px" placeholder="Enter Details">${item.details || ''}</textarea>
                </div>
              </td>
              <td><textarea name="pedagogy${index + 1}" style="height:100%">${item.pedagogy || ''}</textarea></td>
              <td><textarea name="resources${index + 1}" style="height:100%">${item.resources || ''}</textarea></td>
              <td><input type="text" name="credit${index + 1}" class="curr-credit-field" readonly style="background-color:#fff; text-align:center; min-width:40px;"></td>
              <td><input type="number" name="hours${index + 1}" class="curr-hours-field" readonly></td>
              <td><input type="number" name="contact${index + 1}" class="curr-contact-field" readonly></td>
            `;
                curricularBody.appendChild(newRow);
            }
        });
    }

    if (data.assessments && data.assessments.length > 0) {
        const assessmentBody = document.getElementById('assessmentBody');
        assessmentBody.innerHTML = '';

        data.assessments.forEach((assessment, index) => {
            if (index === 0) {
                assessmentBody.innerHTML = `
              <tr>
                <td class="row-number" style="text-align:center;">1</td>
                <td><textarea name="assessment1_title" oninput="autoResizeTextarea(this)" rows="1">${assessment.title || ''}</textarea></td>
                <td><textarea name="assessment1_details" oninput="autoResizeTextarea(this)" rows="1">${assessment.details || ''}</textarea></td>
                <td>
                  <select name="assessment1_form" class="form-select" onchange="updateAssessmentCalc()">
                    <option value="Controlled" ${assessment.form === 'Controlled' ? 'selected' : ''}>Controlled</option>
                    <option value="Uncontrolled" ${assessment.form === 'Uncontrolled' ? 'selected' : ''}>Uncontrolled</option>
                  </select>
                </td>
                <td><input type="text" name="assessment1_length" value="${assessment.length || ''}"></td>
                <td><input type="number" name="assessment1_weight" class="weight-input" oninput="validateWeight(this)" min="0" max="100" value="${assessment.weight || ''}"></td>
              </tr>
            `;
            } else {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
              <td class="row-number" style="text-align:center;">${index + 1}</td>
                <td><textarea name="assessment${index + 1}_title" oninput="autoResizeTextarea(this)" rows="1">${assessment.title || ''}</textarea></td>
                <td><textarea name="assessment${index + 1}_details" oninput="autoResizeTextarea(this)" rows="1">${assessment.details || ''}</textarea></td>
                <td>
                  <select name="assessment${index + 1}_form" class="form-select" onchange="updateAssessmentCalc()">
                    <option value="Controlled" ${assessment.form === 'Controlled' ? 'selected' : ''}>Controlled</option>
                    <option value="Uncontrolled" ${assessment.form === 'Uncontrolled' ? 'selected' : ''}>Uncontrolled</option>
                  </select>
                </td>
                <td><input type="text" name="assessment${index + 1}_length" value="${assessment.length || ''}"></td>
                <td><input type="number" name="assessment${index + 1}_weight" class="weight-input" oninput="validateWeight(this)" min="0" max="100" value="${assessment.weight || ''}"></td>
            `;
                assessmentBody.appendChild(newRow);
            }
        });
    }

    const creditsInput = document.getElementById('creditsInput');
    if (creditsInput?.value) {
        calculateHours();
    } else {
        calculateWeeklyDistribution();
    }
}

// Function to reset form to initial state
function resetFormToInitialState() {
    const outcomesBody = document.getElementById('outcomesBody');
    outcomesBody.innerHTML = `
        <tr>
          <td>
            <div class="outcome-input-wrapper">
              <span class="outcome-number">1.</span>
              <textarea name="outcome1" rows="2"></textarea>
            </div>
          </td>
          <td class="checkbox-cell"><input type="checkbox"></td>
          <td class="checkbox-cell"><input type="checkbox"></td>
          <td class="checkbox-cell"><input type="checkbox"></td>
          <td class="checkbox-cell"><input type="checkbox"></td>
          <td class="checkbox-cell"><input type="checkbox"></td>
        </tr>
      `;

    const curricularBody = document.getElementById('curricularBody');
    curricularBody.innerHTML = `
        <tr>
          <td style="text-align:center; font-weight:bold; background-color:#f9f9f9; vertical-align: middle;">
            <span class="week-display">1</span>
          </td>
          <td>
            <div class="vertical-input-group">
              <label style="font-size: 0.8em; color: #666;">Main Topic:</label>
              <input type="text" name="topic1" placeholder="Enter Main Topic">

              <label style="font-size: 0.8em; color: #666;">Details:</label>
              <textarea name="details1" style="height:60px" placeholder="Enter Details"></textarea>
            </div>
          </td>
          <td><textarea name="pedagogy1" style="height:100%"></textarea></td>
          <td><textarea name="resources1" style="height:100%"></textarea></td>
          <td><input type="text" name="credit1" class="curr-credit-field" readonly style="background-color:#fff; text-align:center; min-width:40px;"></td>
          <td><input type="number" name="hours1" class="curr-hours-field" readonly></td>
          <td><input type="number" name="contact1" class="curr-contact-field" readonly></td>
        </tr>
      `;

    const assessmentBody = document.getElementById('assessmentBody');
    assessmentBody.innerHTML = `
        <tr>
          <td class="row-number" style="text-align:center;">1</td>
          <td><textarea name="assessment1_title" oninput="autoResizeTextarea(this)" rows="1"></textarea></td>
          <td><textarea name="assessment1_details" oninput="autoResizeTextarea(this)" rows="1"></textarea></td>
          <td>
            <select name="assessment1_form" class="form-select" onchange="updateAssessmentCalc()">
              <option value="Controlled">Controlled</option>
              <option value="Uncontrolled">Uncontrolled</option>
            </select>
          </td>
          <td><input type="text" name="assessment1_length"></td>
          <td><input type="number" name="assessment1_weight" class="weight-input" oninput="validateWeight(this)" min="0" max="100"></td>
        </tr>
      `;

    document.getElementById('totalLearningHours').value = '';
    document.getElementById('maxContactHours').value = '';
    document.getElementById('maxNonContactHours').value = '';
    document.getElementById('totalCreditsFooter').innerText = '0';
    document.getElementById('totalHoursFooter').innerText = '0';
    setCurricularContactFooterState(0, 0);
    document.getElementById('totalWeight').value = '';
    document.getElementById('controlledTotal').innerText = '0';
    document.getElementById('uncontrolledTotal').innerText = '0';
    document.getElementById('barControlled').style.width = '0%';
    document.getElementById('barUncontrolled').style.width = '0%';
    document.getElementById('labelControlled').innerText = '';
    document.getElementById('labelUncontrolled').innerText = '';
    document.getElementById('controlledWarning').style.display = 'none';
    document.getElementById('delivery_methods').value = '';
}

// Function to show notification popup
function showNotification(message, type) {
    const existingNotification = document.querySelector('.notification-popup');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification-popup ${type}`;

    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    else if (type === 'warning') icon = 'fa-exclamation-triangle';
    else if (type === 'info') icon = 'fa-info-circle';

    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
      `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ============================================
// YOUR EXISTING FUNCTIONS (unchanged)
// ============================================

// Function to automatically expand text areas
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Alias for assessment textareas
function autoResizeTextarea(textarea) {
    autoResize(textarea);
}

// --- MNQF Level Logic ---
const mnqfLevels = {
    1: "Certificate Level 1",
    2: "Certificate Level 2",
    3: "Certificate Level 3",
    4: "Advanced Certificate",
    5: "Diploma",
    6: "Advanced Diploma / Associate Degree",
    7: "Bachelor's Degree",
    8: "Post-Graduate Diploma",
    9: "Masters Degree",
    10: "Doctoral Degree"
};

const minimumQualificationForLowerLevels = 'Diploma in a relevant field.';
const minimumQualificationForMiddleLevels = "Bachelor's Degree in a relevant field.";
const minimumQualificationForAdvancedLevels = "Master's Degree in a relevant field.";
const minimumQualificationForHighestLevels = 'PhD in a relevant field.';
const automaticMinimumQualifications = [
    minimumQualificationForLowerLevels,
    minimumQualificationForMiddleLevels,
    minimumQualificationForAdvancedLevels,
    minimumQualificationForHighestLevels
];

function updateLevelName() {
    const input = document.getElementById('mnqfInput');
    const label = document.getElementById('mnqfLabel');
    const minimumQualificationInput = document.getElementById('minimumQualificationInput');
    if (!input || !label || !minimumQualificationInput) return;

    const level = parseInt(input.value);
    if (mnqfLevels[level]) {
        label.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- " + mnqfLevels[level];
        label.style.color = "#333";
    } else if (input.value === "") {
        label.innerHTML = "";
    } else {
        label.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Invalid Level)";
        label.style.color = "red";
    }

    if (level >= 1 && level <= 4) {
        minimumQualificationInput.value = minimumQualificationForLowerLevels;
    } else if (level >= 5 && level <= 6) {
        minimumQualificationInput.value = minimumQualificationForMiddleLevels;
    } else if (level >= 7 && level <= 8) {
        minimumQualificationInput.value = minimumQualificationForAdvancedLevels;
    } else if (level >= 9 && level <= 10) {
        minimumQualificationInput.value = minimumQualificationForHighestLevels;
    } else if (automaticMinimumQualifications.includes(minimumQualificationInput.value)) {
        minimumQualificationInput.value = '';
    }

    const creditsInput = document.getElementById('creditsInput');
    if (creditsInput?.value) {
        calculateHours();
    } else {
        calculateWeeklyDistribution();
    }
}

// --- Delivery Methods Logic ---
const deliveryTexts = {
    f2f: `Face-to-face learning takes place through direct, in-person interaction where students and lecturers physically attend scheduled classes, labs, and workshops. All contact hours are fully met through this physical presence, allowing learners to engage in lectures, discussions, group activities, and hands-on tasks while receiving real-time guidance and feedback.`,

    blended: `Blended learning combines in-person instruction with online engagement, allowing students to learn through multiple modes. In this approach, one-third of the contact hours are delivered face to face through students and lecturers physically attending scheduled classes. Another one-third is conducted online through synchronous (real-time) virtual sessions, while the remaining one-third is completed asynchronously through structured online tasks, activities, and self-paced study.`,

    elearning: `E-learning in college is delivered entirely online, allowing students to participate in their coursework without needing to attend physical classes. In this modality, two-thirds of the contact hours are conducted through synchronous (real-time) virtual sessions using Google Meet or similar video-conferencing tools, enabling direct interaction between students and lecturers. The remaining one-third of the learning takes place asynchronously through structured online activities, digital resources, and self-paced study.`
};

const deliveryModeOrder = ['f2f', 'blended', 'elearning'];
const deliveryModeLabels = {
    f2f: 'Face to Face',
    blended: 'Blended',
    elearning: 'E-Learning'
};

function updateDeliveryMethods() {
    const deliverySection = document.getElementById('section11_4');
    const textArea = document.getElementById('delivery_methods');
    if (!deliverySection || !textArea) return;

    const selectedModes = new Set(
        Array.from(
            deliverySection.querySelectorAll('input[name="delivery_mode"]:checked'),
            checkbox => checkbox.value
        )
    );
    const combinedText = deliveryModeOrder
        .filter(mode => selectedModes.has(mode))
        .map(mode => `${deliveryModeLabels[mode]}:\n${deliveryTexts[mode]}`)
        .join("\n\n");

    textArea.value = combinedText;
    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';
}

function initializeDeliveryModality() {
    const deliverySection = document.getElementById('section11_4');
    if (!deliverySection || deliverySection.dataset.bound === 'true') return;

    deliverySection.dataset.bound = 'true';
    deliverySection.querySelectorAll('input[name="delivery_mode"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateDeliveryMethods);
    });

    updateDeliveryMethods();
}

// --- 11.3 Calculation Logic ---
function setCreditHourFields(creditValue) {
    const totalLearningHoursInput = document.getElementById('totalLearningHours');
    const maxContactHoursInput = document.getElementById('maxContactHours');
    const maxNonContactHoursInput = document.getElementById('maxNonContactHours');
    if (!totalLearningHoursInput || !maxContactHoursInput || !maxNonContactHoursInput) return;

    const credits = parseFloat(creditValue) || 0;
    const totalHours = Math.round(credits * 10);
    totalLearningHoursInput.value = totalHours;

    const moduleLevel = parseInt(document.getElementById('mnqfInput')?.value, 10);
    const contactRatio = moduleLevel >= 1 && moduleLevel <= 3 ? 0.5 : 1 / 3;
    const contactHours = Math.ceil(totalHours * contactRatio);
    maxContactHoursInput.value = contactHours;

    const nonContactHours = Math.max(totalHours - contactHours, 0);
    maxNonContactHoursInput.value = nonContactHours;
}

function calculateHours() {
    const creditsInput = document.getElementById('creditsInput');
    if (!creditsInput) return;

    setCreditHourFields(creditsInput.value);
    calculateWeeklyDistribution();
}

function calculateHoursInline(input) {
    setCreditHourFields(input?.value);
    calculateWeeklyDistribution();
}

window.calculateHours = calculateHours;
window.calculateHoursInline = calculateHoursInline;

function initializeCreditHoursCalculation() {
    const creditsInput = document.getElementById('creditsInput');
    if (!creditsInput || creditsInput.dataset.bound === 'true') return;

    creditsInput.dataset.bound = 'true';
    ['input', 'keyup', 'change'].forEach(eventName => {
        creditsInput.addEventListener(eventName, calculateHours);
    });
}

document.addEventListener('input', function (event) {
    if (event.target?.id === 'creditsInput') {
        calculateHoursInline(event.target);
    }
});

document.addEventListener('change', function (event) {
    if (event.target?.id === 'creditsInput') {
        calculateHoursInline(event.target);
    }
});

// --- 11.8 Learning Outcomes Logic ---
function addOutcome() {
    var tbody = document.getElementById("outcomesBody");
    var nextNumber = tbody.rows.length + 1;
    var newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td>
          <div class="outcome-input-wrapper">
            <span class="outcome-number">${nextNumber}.</span>
            <textarea name="outcome${nextNumber}" rows="2"></textarea>
          </div>
        </td>
        <td class="checkbox-cell"><input type="checkbox"></td>
        <td class="checkbox-cell"><input type="checkbox"></td>
        <td class="checkbox-cell"><input type="checkbox"></td>
        <td class="checkbox-cell"><input type="checkbox"></td>
        <td class="checkbox-cell"><input type="checkbox"></td>
      `;
    tbody.appendChild(newRow);
}

// --- 11.9 Curricular Content Logic ---
function setCurricularContactFooterState(currentTotal, requiredTotal) {
    const footer = document.getElementById('totalContactFooter');
    if (!footer) return;

    footer.innerText = currentTotal;

    if (currentTotal !== requiredTotal) {
        footer.style.color = '#c00000';
        footer.title = 'Contact hours mis-match';
        footer.setAttribute('aria-label', 'Contact hours mis-match');
    } else {
        footer.style.color = '';
        footer.removeAttribute('title');
        footer.removeAttribute('aria-label');
    }
}

function reduceContactHoursToRequiredTotal(contactValues, requiredTotal) {
    let excess = contactValues.reduce((sum, value) => sum + value, 0) - requiredTotal;
    if (excess <= 0) return contactValues;

    while (excess > 0 && contactValues.some(value => value > 0)) {
        for (let index = contactValues.length - 1; index >= 0 && excess > 0; index--) {
            if (contactValues[index] > 0) {
                contactValues[index] -= 1;
                excess -= 1;
            }
        }
    }

    return contactValues;
}

function calculateWeeklyDistribution() {
    const tlhInput = document.getElementById('totalLearningHours');
    const mchInput = document.getElementById('maxContactHours');
    if (!tlhInput || !mchInput) return;

    const totalLearning = parseFloat(tlhInput.value) || 0;
    const totalContact = parseFloat(mchInput.value) || 0;
    const moduleLevel = parseInt(document.getElementById('mnqfInput')?.value, 10);

    const weeklyLearning = Math.ceil(totalLearning / 15);
    const weeklyContact = Number.isInteger(moduleLevel)
        ? Math.ceil(weeklyLearning * (moduleLevel <= 3 ? 0.5 : 1 / 3))
        : Math.ceil(totalContact / 15);

    const rows = Array.from(document.querySelectorAll('#curricularBody tr'));
    const contactValues = reduceContactHoursToRequiredTotal(
        rows.map(() => weeklyContact),
        totalContact
    );
    let sumLearning = 0;
    let sumContact = 0;

    rows.forEach((row, index) => {
        const hoursInput = row.querySelector('.curr-hours-field');
        const contactInput = row.querySelector('.curr-contact-field');
        const creditInput = row.querySelector('.curr-credit-field');

        if (hoursInput) {
            hoursInput.value = weeklyLearning;
            sumLearning += weeklyLearning;
        }
        if (contactInput) {
            const contactHours = contactValues[index] || 0;
            contactInput.value = contactHours;
            sumContact += contactHours;
        }
        if (creditInput) {
            creditInput.value = "";
        }
    });

    document.getElementById('totalHoursFooter').innerText = sumLearning;
    setCurricularContactFooterState(sumContact, totalContact);

    const creditSource = document.getElementById('creditsInput');
    const creditTarget = document.getElementById('totalCreditsFooter');
    if (creditSource && creditTarget) {
        creditTarget.innerText = creditSource.value || "0";
    }
}

function addWeek() {
    const tableBody = document.getElementById('curricularBody');
    const rowCount = tableBody.rows.length + 1;
    const firstRow = tableBody.rows[0];
    const newRow = firstRow.cloneNode(true);

    const weekDisplay = newRow.querySelector('.week-display');
    if (weekDisplay) weekDisplay.innerText = rowCount;

    const inputs = newRow.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        if (!input.classList.contains('curr-hours-field') &&
            !input.classList.contains('curr-contact-field')) {
            input.value = '';
        }
        let namePart = input.name.replace(/\d+$/, '');
        input.name = namePart + rowCount;
    });

    tableBody.appendChild(newRow);
    calculateWeeklyDistribution();
}

function deleteWeek() {
    const tableBody = document.getElementById('curricularBody');
    const rowCount = tableBody.rows.length;
    if (rowCount > 1) {
        tableBody.deleteRow(-1);
        calculateWeeklyDistribution();
    } else {
        alert("Cannot delete Week 1. At least one week is required.");
    }
}

// --- 11.10 Assessment Methods Logic ---
function validateWeight(input) {
    const tbody = document.getElementById('assessmentBody');
    const rows = tbody.getElementsByTagName('tr');
    let otherTotal = 0;

    for (let i = 0; i < rows.length; i++) {
        const weightInput = rows[i].querySelector('.weight-input');
        if (weightInput !== input) {
            otherTotal += parseFloat(weightInput.value) || 0;
        }
    }

    const remaining = 100 - otherTotal;
    let currentVal = parseFloat(input.value);
    if (isNaN(currentVal)) currentVal = 0;

    if (currentVal > remaining) {
        input.value = Math.max(0, remaining);
    }

    if (currentVal < 0) {
        input.value = 0;
    }

    updateAssessmentCalc();
}

function updateAssessmentCalc() {
    const tbody = document.getElementById('assessmentBody');
    const rows = tbody.getElementsByTagName('tr');
    let totalWeight = 0;
    let controlledWeight = 0;
    let uncontrolledWeight = 0;

    for (let i = 0; i < rows.length; i++) {
        const weightInput = rows[i].querySelector('.weight-input');
        const formSelect = rows[i].querySelector('.form-select');
        const weight = parseFloat(weightInput.value) || 0;
        const formType = formSelect.value;

        totalWeight += weight;
        if (formType === 'Controlled') {
            controlledWeight += weight;
        } else {
            uncontrolledWeight += weight;
        }
    }

    document.getElementById('totalWeight').value = totalWeight;
    document.getElementById('controlledTotal').innerText = controlledWeight;
    document.getElementById('uncontrolledTotal').innerText = uncontrolledWeight;

    let controlledPct = Math.min(controlledWeight, 100);
    let uncontrolledPct = Math.min(uncontrolledWeight, 100);

    if (totalWeight > 100) {
        controlledPct = (controlledWeight / totalWeight) * 100;
        uncontrolledPct = (uncontrolledWeight / totalWeight) * 100;
    }

    document.getElementById('barControlled').style.width = controlledPct + '%';
    document.getElementById('barUncontrolled').style.width = uncontrolledPct + '%';

    document.getElementById('labelControlled').innerText = controlledWeight > 0 ? 'Controlled ' + controlledWeight + '%' : '';
    document.getElementById('labelUncontrolled').innerText = uncontrolledWeight > 0 ? 'Uncontrolled ' + uncontrolledWeight + '%' : '';

    const warningMsg = document.getElementById('controlledWarning');
    if (controlledWeight < 50) {
        warningMsg.style.display = 'block';
    } else {
        warningMsg.style.display = 'none';
    }
}

function addAssessmentRow() {
    const tbody = document.getElementById('assessmentBody');
    const rowCount = tbody.rows.length + 1;
    const newRow = document.createElement('tr');

    newRow.innerHTML = `
        <td class="row-number" style="text-align:center;">${rowCount}</td>
        <td><textarea name="assessment${rowCount}_title" oninput="autoResizeTextarea(this)" rows="1"></textarea></td>
        <td><textarea name="assessment${rowCount}_details" oninput="autoResizeTextarea(this)" rows="1"></textarea></td>
        <td>
          <select name="assessment${rowCount}_form" class="form-select" onchange="updateAssessmentCalc()">
            <option value="Controlled">Controlled</option>
            <option value="Uncontrolled">Uncontrolled</option>
          </select>
        </td>
        <td><input type="text" name="assessment${rowCount}_length"></td>
        <td><input type="number" name="assessment${rowCount}_weight" class="weight-input" oninput="validateWeight(this)" min="0" max="100"></td>
      `;

    tbody.appendChild(newRow);
    updateAssessmentCalc();
}

function deleteAssessmentRow() {
    const tbody = document.getElementById('assessmentBody');
    const rowCount = tbody.rows.length;
    if (rowCount > 1) {
        tbody.deleteRow(rowCount - 1);
        updateAssessmentCalc();
    } else {
        alert("You must have at least one assessment task.");
    }
}

function initializePaneButtons() {
    try {
        const pane = document.querySelector('.pane-buttons');
        if (!pane) return;
        if (pane.dataset.bound === 'true') return;
        pane.dataset.bound = 'true';

        const btnNew = pane.querySelector('.btn-new');
        const btnSave = pane.querySelector('.btn-save');
        const btnOutlines = pane.querySelector('.btn-outlines');
        const btnExport = pane.querySelector('.btn-export');
        const btnSample = pane.querySelector('.btn-sample');
        const btnPrint = pane.querySelector('.btn-print');
        const btnPrintPdf = pane.querySelector('.btn-print-pdf');

        if (btnNew) btnNew.addEventListener('click', (e) => { e.preventDefault(); createNewOutline(); });
        if (btnSave) btnSave.addEventListener('click', (e) => { e.preventDefault(); saveDraft(); });
        if (btnOutlines) btnOutlines.addEventListener('click', (e) => { e.preventDefault(); showMyOutlines(); });
        if (btnExport) btnExport.addEventListener('click', (e) => { e.preventDefault(); openExportModal(); });
        if (btnSample) btnSample.addEventListener('click', (e) => { e.preventDefault(); generateSamplePDF(); });
        if (btnPrint) btnPrint.addEventListener('click', (e) => { e.preventDefault(); printForm(); });
        if (btnPrintPdf) {
            btnPrintPdf.dataset.bound = 'true';
            btnPrintPdf.addEventListener('click', (e) => { e.preventDefault(); printFullFormPDF(); });
        }
    } catch (err) {
        console.warn('Pane button wiring failed:', err);
    }
}

function initPage() {
    updateLevelName();
    initializeDeliveryModality();
    initializeCreditHoursCalculation();
    if (document.getElementById('creditsInput')?.value) {
        calculateHours();
    }
    updateAssessmentCalc();
    loadOutlinesList();
    initializePaneButtons();

    const moduleForm = document.getElementById('moduleForm');
    if (moduleForm) {
        moduleForm.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', function () {
                this.dataset.userChanged = 'true';
            });
        });

        moduleForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveDraft();
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

function printForm() {
    if (!hasEnteredFormData()) {
        notifyMissingFormData('print the form');
        return;
    }

    const missingSections = validateFormBeforeExport();
    if (missingSections.length > 0) {
        notifyMissingRequiredFields('print the form', missingSections);
        showValidationWarning(missingSections);
        return;
    }

    window.print();
}

function printFullFormPDF() {
    try {
        window.print();
    } catch (err) {
        console.error('Print Error:', err);
        showNotification('Unable to open print dialog. Please use your browser print command.', 'error');
    }
}

// Sample PDF generation for testing the export layout.
function getSampleData() {
    return {
        module_name_en: 'Introduction to Web Development',
        programme_name: 'Bachelor of Information Technology',
        module_name_dhivehi: 'ވެބް ޑިވެލޮޕްމެންޓް',
        module_name_arabic: 'مقدمة في تطوير الويب',
        module_description: 'This module introduces learners to the principles and practices of modern web development. It covers semantic HTML, CSS layout, responsive design, basic JavaScript, accessibility, and the development of a standards-compliant web project.',
        module_code: 'WD101',
        module_level: '3',
        contact_credits: '10',
        contact_total_learning_hours: '100',
        contact_hours: '50',
        non_contact_hours: '50',
        delivery_modes: ['f2f', 'blended'],
        delivery_methods: 'Lectures, guided laboratory sessions, supervised practical work, online learning activities, and independent project development.',
        instructor_qualification: 'Bachelor degree or higher qualification in Computing, Information Technology, Software Engineering, or a closely related field.',
        prerequisite: 'Basic computer literacy',
        corequisites: 'None',
        outcomes: [
            { number: '1', text: 'Explain the structure and purpose of semantic HTML documents.', competencies: [{ checked: true }, { checked: false }, { checked: true }, { checked: false }, { checked: false }] },
            { number: '2', text: 'Apply CSS rules and layout techniques to produce responsive web pages.', competencies: [{ checked: true }, { checked: true }, { checked: true }, { checked: false }, { checked: false }] },
            { number: '3', text: 'Develop a small interactive website using HTML, CSS, and JavaScript.', competencies: [{ checked: false }, { checked: true }, { checked: true }, { checked: true }, { checked: true }] }
        ],
        curricular_content: [
            { week: '1', topic: 'HTML Foundations', details: 'Document structure, headings, lists, links, images, forms, and semantic elements.', pedagogy: 'Lecture and lab', resources: 'Slides, code examples, browser developer tools', credit: '1', hours: '10', contact: '5' },
            { week: '2', topic: 'CSS Styling and Layout', details: 'Selectors, cascade, box model, Flexbox, Grid, responsive breakpoints, and print-friendly styling.', pedagogy: 'Demonstration and practical', resources: 'CSS reference material and lab sheet', credit: '1', hours: '10', contact: '5' },
            { week: '3', topic: 'JavaScript Interaction', details: 'DOM selection, events, form validation, and basic interface behaviour.', pedagogy: 'Workshop', resources: 'Sample scripts and exercises', credit: '1', hours: '10', contact: '5' }
        ],
        assessments: [
            { title: 'Practical Website Project', details: 'Design and develop a responsive multi-page website that meets the provided technical and accessibility requirements.', form: 'Controlled', length: 'Project submission', weight: '60' },
            { title: 'Skills Test', details: 'Timed practical test covering HTML, CSS, and basic JavaScript tasks.', form: 'Controlled', length: '2 hours', weight: '20' },
            { title: 'Learning Portfolio', details: 'Short reflective portfolio documenting weekly practical work and improvements.', form: 'Uncontrolled', length: 'Portfolio', weight: '20' }
        ],
        core_texts: 'Duckett, J. (2011). HTML and CSS: Design and Build Websites. Wiley.\nDuckett, J. (2014). JavaScript and JQuery: Interactive Front-End Web Development. Wiley.',
        additional_references: 'MDN Web Docs\nW3C Web Accessibility Initiative',
        developer_name: 'John Doe',
        qualification: 'MSc Computer Science',
        designation: 'Lecturer, Department of Computing',
        email_contact: 'john.doe@example.edu'
    };
}

function generateSamplePDF() {
    exportToPDF('formal_module_outline_sample', getSampleData(), false);
}

// Expose key functions to the global/window scope so inline `onclick` handlers work
// Some environments wrap scripts; explicit exposure ensures the buttons can call them.
/* eslint-disable no-undef */
window.createNewOutline = createNewOutline;
window.saveDraft = saveDraft;
window.showMyOutlines = showMyOutlines;
window.openExportModal = openExportModal;
window.generateSamplePDF = generateSamplePDF;
window.closeModal = closeModal;
window.confirmExport = confirmExport;
window.confirmSave = confirmSave;
window.closeValidationModal = closeValidationModal;
window.confirmLoad = confirmLoad;
window.downloadPDF = downloadPDF;
window.printForm = printForm;
window.printFullFormPDF = printFullFormPDF;
window.updateDeliveryMethods = updateDeliveryMethods;
window.calculateHours = calculateHours;
window.calculateHoursInline = calculateHoursInline;
/* eslint-enable no-undef */
