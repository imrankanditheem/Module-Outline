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

    // Check 11.1 Module Name (English is required)
    const moduleNameEn = document.querySelector('[name="module_name_en"]')?.value?.trim();
    if (!moduleNameEn) {
        missingSections.push("11.1 Module Name (English)");
    }

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
    // Validate form before showing export modal
    const missingSections = validateFormBeforeExport();

    if (missingSections.length > 0) {
        // Show validation warning modal instead of export modal
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

// Function to export to PDF with proper formatting
function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatParagraph(value) {
    return escapeHTML(value)
        .split('\n')
        .map(line => `<p>${line || '&nbsp;'}</p>`)
        .join('');
}

function buildPDFContent(data) {
    const deliveryModes = (data.delivery_modes || []).map(mode => {
        if (mode === 'f2f') return 'Face to Face';
        if (mode === 'blended') return 'Blended';
        if (mode === 'elearning') return 'E-Learning';
        return escapeHTML(mode);
    }).join(', ');

    const outcomesRows = (data.outcomes || []).map(outcome => {
        const cells = outcome.competencies.map(c => c.checked ? '✔' : '');
        return `
            <tr>
                <td>${outcome.number || ''}</td>
                <td>${escapeHTML(outcome.text)}</td>
                <td>${cells[0]}</td>
                <td>${cells[1]}</td>
                <td>${cells[2]}</td>
                <td>${cells[3]}</td>
                <td>${cells[4]}</td>
            </tr>`;
    }).join('');

    const curricularRows = (data.curricular_content || []).map(item => `
        <tr>
            <td>${escapeHTML(item.week)}</td>
            <td>${escapeHTML(item.topic)}</td>
            <td>${escapeHTML(item.details)}</td>
            <td>${escapeHTML(item.pedagogy)}</td>
            <td>${escapeHTML(item.resources)}</td>
            <td>${escapeHTML(item.credit)}</td>
            <td>${escapeHTML(item.hours)}</td>
            <td>${escapeHTML(item.contact)}</td>
        </tr>`).join('');

    const assessmentRows = (data.assessments || []).map((assessment, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(assessment.title)}</td>
            <td>${escapeHTML(assessment.details)}</td>
            <td>${escapeHTML(assessment.form)}</td>
            <td>${escapeHTML(assessment.length)}</td>
            <td>${escapeHTML(assessment.weight)}</td>
        </tr>`).join('');

    const controlledWeight = data.assessments?.reduce((sum, item) => sum + (item.form === 'Uncontrolled' ? 0 : parseFloat(item.weight || 0)), 0) || 0;
    const uncontrolledWeight = data.assessments?.reduce((sum, item) => sum + (item.form === 'Uncontrolled' ? parseFloat(item.weight || 0) : 0), 0) || 0;
    const totalWeight = controlledWeight + uncontrolledWeight;

    return `
        <div class="pdf-document">
            <div class="pdf-header">
                <h1>Module Outline</h1>
                <p class="pdf-subtitle"><strong>Module Title:</strong> ${escapeHTML(data.module_name_en)}</p>
                <table class="pdf-table simple-table summary-table">
                    <tbody>
                        <tr>
                            <td><strong>Module Code</strong></td>
                            <td>${escapeHTML(data.module_code)}</td>
                            <td><strong>Module Level</strong></td>
                            <td>${escapeHTML(data.module_level)} ${escapeHTML(mnqfLevels[data.module_level] || '')}</td>
                        </tr>
                        <tr>
                            <td><strong>Credits</strong></td>
                            <td>${escapeHTML(data.contact_credits)}</td>
                            <td><strong>Total Learning Hours</strong></td>
                            <td>${escapeHTML(data.contact_total_learning_hours)}</td>
                        </tr>
                        <tr>
                            <td><strong>Contact Hours</strong></td>
                            <td>${escapeHTML(data.contact_hours)}</td>
                            <td><strong>Delivery Mode</strong></td>
                            <td>${deliveryModes || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <section class="pdf-section">
                <h2>11.1 Module Name</h2>
                <table class="pdf-table simple-table">
                    <tbody>
                        <tr><td><strong>English</strong></td><td>${escapeHTML(data.module_name_en)}</td></tr>
                        <tr><td><strong>Dhivehi</strong></td><td dir="rtl" style="font-family:'MV Typewriter', serif;">${escapeHTML(data.module_name_dhivehi)}</td></tr>
                        <tr><td><strong>Arabic</strong></td><td dir="rtl">${escapeHTML(data.module_name_arabic)}</td></tr>
                    </tbody>
                </table>
                <div class="pdf-paragraph"><strong>Module Description</strong></div>
                <div class="pdf-paragraph">${formatParagraph(data.module_description)}</div>
            </section>

            <section class="pdf-section">
                <h2>11.2 Module Code</h2>
                <p>${escapeHTML(data.module_code)}</p>
            </section>

            <section class="pdf-section">
                <h2>11.3 Credit & Hours Distribution</h2>
                <table class="pdf-table simple-table">
                    <tbody>
                        <tr><td><strong>Number of Credits</strong></td><td>${escapeHTML(data.contact_credits)}</td></tr>
                        <tr><td><strong>Total Learning Hours</strong></td><td>${escapeHTML(data.contact_total_learning_hours)}</td></tr>
                        <tr><td><strong>Contact Hours</strong></td><td>${escapeHTML(data.contact_hours)}</td></tr>
                        <tr><td><strong>Non-contact Hours</strong></td><td>${escapeHTML(data.non_contact_hours)}</td></tr>
                    </tbody>
                </table>
            </section>

            <section class="pdf-section">
                <h2>11.3 Credit & Hours Distribution</h2>
                <table class="pdf-table simple-table">
                    <tbody>
                        <tr><td><strong>Number of Credits</strong></td><td>${escapeHTML(data.contact_credits)}</td></tr>
                        <tr><td><strong>Total Learning Hours</strong></td><td>${escapeHTML(data.contact_total_learning_hours)}</td></tr>
                        <tr><td><strong>Contact Hours</strong></td><td>${escapeHTML(data.contact_hours)}</td></tr>
                        <tr><td><strong>Non-contact Hours</strong></td><td>${escapeHTML(data.non_contact_hours)}</td></tr>
                    </tbody>
                </table>
            </section>

            <section class="pdf-section">
                <h2>11.4 Delivery Modality</h2>
                <p><strong>Mode:</strong> ${deliveryModes || 'N/A'}</p>
                <div class="pdf-paragraph">${formatParagraph(data.delivery_methods)}</div>
            </section>

            <section class="pdf-section">
                <h2>11.5 Minimum Qualification</h2>
                <p>${escapeHTML(data.instructor_qualification)}</p>
            </section>

            <section class="pdf-section">
                <h2>11.6 Prerequisite</h2>
                <p>${escapeHTML(data.prerequisite)}</p>
            </section>

            <section class="pdf-section">
                <h2>11.7 Corequisites</h2>
                <p>${escapeHTML(data.corequisites)}</p>
            </section>

            <section class="pdf-section">
                <h2>11.8 Expected Learning Outcomes</h2>
                <table class="pdf-table competencies-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Outcome Statement</th>
                            <th>Knowledge &amp; understanding</th>
                            <th>Practice</th>
                            <th>Generic Cognitive Skills</th>
                            <th>Communication, ICT &amp; Numeracy</th>
                            <th>Autonomy &amp; Accountability</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${outcomesRows || '<tr><td colspan="7">No learning outcomes entered.</td></tr>'}
                    </tbody>
                </table>
            </section>

            <section class="pdf-section">
                <h2>11.9 Curricular Content</h2>
                <table class="pdf-table pdf-table-bordered">
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th>Main Topic &amp; Details</th>
                            <th>Pedagogy</th>
                            <th>Resources</th>
                            <th>Credit</th>
                            <th>Total Learning Hours</th>
                            <th>Contact Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${curricularRows || '<tr><td colspan="7">No curricular content entered.</td></tr>'}
                    </tbody>
                </table>
            </section>

            <section class="pdf-section">
                <h2>11.10 Assessment Methods and Grading</h2>
                <p>This section defines controlled and uncontrolled assessment weightages for the module.</p>
                <table class="pdf-table pdf-table-bordered">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Task Title</th>
                            <th>Details</th>
                            <th>Form</th>
                            <th>Length</th>
                            <th>Weight (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assessmentRows || '<tr><td colspan="6">No assessment items entered.</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" style="text-align:right;"><strong>Total Weightage</strong></td>
                            <td><strong>${totalWeight}</strong></td>
                        </tr>
                    </tfoot>
                </table>
                <p><strong>Controlled Assessment Weightage:</strong> ${controlledWeight}%</p>
                <p><strong>Uncontrolled Assessment Weightage:</strong> ${uncontrolledWeight}%</p>
            </section>

            <section class="pdf-section">
                <h2>11.11 Reference Materials</h2>
                <p><strong>Core Texts:</strong></p>
                <div class="pdf-paragraph">${formatParagraph(data.core_texts)}</div>
                <p><strong>Additional References:</strong></p>
                <div class="pdf-paragraph">${formatParagraph(data.additional_references)}</div>
            </section>

            <section class="pdf-section">
                <h2>Developed By</h2>
                <table class="pdf-table simple-table">
                    <tbody>
                        <tr><td><strong>Full Name:</strong></td><td>${escapeHTML(data.developer_name)}</td></tr>
                        <tr><td><strong>Highest Qualification:</strong></td><td>${escapeHTML(data.qualification)}</td></tr>
                        <tr><td><strong>Designation and Office:</strong></td><td>${escapeHTML(data.designation)}</td></tr>
                        <tr><td><strong>Email ID:</strong></td><td>${escapeHTML(data.email_contact)}</td></tr>
                    </tbody>
                </table>
            </section>
        </div>
    `;
}

function exportToPDF(customName) {
    showNotification('Generating PDF…', 'info');
    const formData = collectFormData();
    const pdfTemplate = document.getElementById('pdfTemplate');
    pdfTemplate.innerHTML = buildPDFContent(formData);

    const exportClone = pdfTemplate.cloneNode(true);
    exportClone.id = 'pdfTemplateExportClone';
    exportClone.style.position = 'fixed';
    exportClone.style.left = '0';
    exportClone.style.top = '0';
    exportClone.style.width = '160mm';
    exportClone.style.minHeight = '297mm';
    exportClone.style.opacity = '1';
    exportClone.style.visibility = 'visible';
    exportClone.style.pointerEvents = 'none';
    exportClone.style.zIndex = '10000';
    exportClone.style.background = '#ffffff';
    exportClone.style.overflow = 'visible';
    document.body.appendChild(exportClone);

    const finalFilename = `${customName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    const pdfModule = window.jspdf;
    const doc = new pdfModule.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    html2canvas(exportClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: 0
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = pageWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        const pageHeightPx = Math.floor((canvas.width * pageHeight) / pageWidth);
        let heightLeft = canvas.height;
        let position = 0;
        let pageCount = 1;

        while (heightLeft > 0) {
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = Math.min(pageHeightPx, heightLeft);
            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, position, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
            const pageData = pageCanvas.toDataURL('image/png');

            if (pageCount > 1) {
                doc.addPage();
            }

            doc.addImage(pageData, 'PNG', 0, 0, imgWidth, (pageCanvas.height * imgWidth) / canvas.width);
            heightLeft -= pageHeightPx;
            position += pageHeightPx;
            pageCount += 1;
        }

        const totalPages = doc.internal.getNumberOfPages();
        doc.setFont('Times', '');
        doc.setFontSize(10);
        for (let page = 1; page <= totalPages; page++) {
            doc.setPage(page);
            doc.text(`Page ${page} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        doc.save(finalFilename);

        const pdfRecord = {
            id: `pdf_${Date.now()}`,
            title: customName,
            moduleCode: formData.module_code || 'Untitled',
            moduleName: formData.module_name_en || 'Untitled Module',
            timestamp: new Date().toISOString(),
            filename: finalFilename,
            type: 'pdf'
        };

        pdfOutlines.unshift(pdfRecord);
        localStorage.setItem('modulePDFs', JSON.stringify(pdfOutlines));

        showNotification('PDF exported successfully!', 'success');
        if (document.getElementById('outlinesPreview').classList.contains('active')) {
            loadOutlinesList();
        }
    }).catch(err => {
        console.error('PDF Export Error:', err);
        showNotification('Failed to export PDF', 'error');
    }).finally(() => {
        if (exportClone && exportClone.parentNode) {
            exportClone.parentNode.removeChild(exportClone);
        }
    });
}

// Function to download PDF
function downloadPDF(pdfId) {
    const pdfRecord = pdfOutlines.find(pdf => pdf.id === pdfId);
    if (pdfRecord) {
        showNotification(`Downloading ${pdfRecord.filename}...`, 'info');
        // Regenerate the PDF with the saved title
        exportToPDF(pdfRecord.title);
    }
}

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
    document.getElementById('totalContactFooter').innerText = '0';
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

function updateLevelName() {
    const input = document.getElementById('mnqfInput');
    const label = document.getElementById('mnqfLabel');
    if (!input || !label) return;
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
}

// --- Delivery Methods Logic ---
const deliveryTexts = {
    f2f: `Face-to-face learning takes place through direct, in-person interaction where students and lecturers physically attend scheduled classes, labs, and workshops. All contact hours are fully met through this physical presence, allowing learners to engage in lectures, discussions, group activities, and hands-on tasks while receiving real-time guidance and feedback.`,

    blended: `Blended learning combines in-person instruction with online engagement, allowing students to learn through multiple modes. In this approach, one-third of the contact hours are delivered face to face through students and lecturers physically attending scheduled classes. Another one-third is conducted online through synchronous (real-time) virtual sessions, while the remaining one-third is completed asynchronously through structured online tasks, activities, and self-paced study.`,

    elearning: `E-learning in college is delivered entirely online, allowing students to participate in their coursework without needing to attend physical classes. In this modality, two-thirds of the contact hours are conducted through synchronous (real-time) virtual sessions using Google Meet or similar video-conferencing tools, enabling direct interaction between students and lecturers. The remaining one-third of the learning takes place asynchronously through structured online activities, digital resources, and self-paced study.`
};

function updateDeliveryMethods() {
    const selectedModes = [];
    document.querySelectorAll('input[name="delivery_mode"]:checked').forEach(cb => {
        selectedModes.push(cb.value);
    });

    let combinedText = selectedModes
        .map(mode => deliveryTexts[mode])
        .join("\n\n");

    const textArea = document.getElementById('delivery_methods');
    textArea.value = combinedText;

    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';
}

// --- 11.3 Calculation Logic ---
function calculateHours() {
    const creditsInput = document.getElementById('creditsInput');
    const credits = parseFloat(creditsInput.value) || 0;
    const totalHours = Math.round(credits * 10);
    document.getElementById('totalLearningHours').value = totalHours;

    const contactHours = Math.floor(totalHours / 3);
    document.getElementById('maxContactHours').value = contactHours;

    const nonContactHours = totalHours - contactHours;
    document.getElementById('maxNonContactHours').value = nonContactHours;

    calculateWeeklyDistribution();
}

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
function calculateWeeklyDistribution() {
    const tlhInput = document.getElementById('totalLearningHours');
    const mchInput = document.getElementById('maxContactHours');
    if (!tlhInput || !mchInput) return;

    const totalLearning = parseFloat(tlhInput.value) || 0;
    const totalContact = parseFloat(mchInput.value) || 0;

    const weeklyLearning = Math.ceil(totalLearning / 15);
    const weeklyContact = Math.ceil(totalContact / 15);

    const rows = document.querySelectorAll('#curricularBody tr');
    let sumLearning = 0;
    let sumContact = 0;

    rows.forEach(row => {
        const hoursInput = row.querySelector('.curr-hours-field');
        const contactInput = row.querySelector('.curr-contact-field');
        const creditInput = row.querySelector('.curr-credit-field');

        if (hoursInput) {
            hoursInput.value = weeklyLearning;
            sumLearning += weeklyLearning;
        }
        if (contactInput) {
            contactInput.value = weeklyContact;
            sumContact += weeklyContact;
        }
        if (creditInput) {
            creditInput.value = "";
        }
    });

    document.getElementById('totalHoursFooter').innerText = sumLearning;
    document.getElementById('totalContactFooter').innerText = sumContact;

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

// Initialize on load
window.addEventListener('DOMContentLoaded', (event) => {
    updateLevelName();
    if (document.getElementById('creditsInput').value) {
        calculateHours();
    }
    updateAssessmentCalc();
    loadOutlinesList();

    // Set up form submission
    document.getElementById('moduleForm').addEventListener('submit', function (e) {
        e.preventDefault();
        saveDraft();
    });
});
