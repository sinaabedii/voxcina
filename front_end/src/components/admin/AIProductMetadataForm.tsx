import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  vision: boolean;
  cost_per_1m_tokens: number;
  recommended: boolean;
}

interface ProductMetadataFormData {
  // Required fields for AI generation
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  gender: string;
  images: string[];

  // AI-generated fields
  namePersian: string;
  descriptionPersian: string;
  keywords: string[];
  tags: string[];
  materialPersian: string;
  materialEnglish: string;
  materialTags: string[];
  stylePersian: string;
  styleEnglish: string;
  occasionTags: string[];
  season: string[];
  fitType: string;
  ageGroup: string;
}

interface VocabularyOption {
  value: string;
  label: string;
  category: string;
}

interface AIProductMetadataFormProps {
  initialData?: Partial<ProductMetadataFormData>;
  onSave: (data: ProductMetadataFormData) => void;
  onCancel?: () => void;
}

const AIProductMetadataForm: React.FC<AIProductMetadataFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ProductMetadataFormData>({
    name: '',
    description: '',
    category: '',
    brand: '',
    price: 0,
    gender: 'مردانه',
    images: [],
    namePersian: '',
    descriptionPersian: '',
    keywords: [],
    tags: [],
    materialPersian: '',
    materialEnglish: '',
    materialTags: [],
    stylePersian: '',
    styleEnglish: '',
    occasionTags: [],
    season: [],
    fitType: 'معمولی',
    ageGroup: 'بزرگسال',
    ...initialData,
  });

  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [fieldDescriptions, setFieldDescriptions] = useState<Record<string, string>>({});
  const [vocabularies, setVocabularies] = useState<{
    materials: VocabularyOption[];
    styles: VocabularyOption[];
    occasions: VocabularyOption[];
  }>({ materials: [], styles: [], occasions: [] });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenerationEnabled, setAiGenerationEnabled] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    loadAIModels();
    loadFieldDescriptions();
    loadVocabularies();
  }, []);

  useEffect(() => {
    // Check if required fields are filled to enable AI generation
    const requiredFilled = !!(
      formData.name &&
      formData.description &&
      formData.category &&
      formData.price > 0
    );
    setAiGenerationEnabled(requiredFilled);
  }, [formData.name, formData.description, formData.category, formData.price]);

  const loadAIModels = async () => {
    try {
      const response = await axios.get('/api/admin/ai/models');
      setAvailableModels(response.data.data);
      // Set default to recommended model
      const recommended = response.data.data.find((m: AIModel) => m.recommended);
      if (recommended) {
        setSelectedModel(recommended.id);
      }
    } catch (error) {
      console.error('Failed to load AI models:', error);
    }
  };

  const loadFieldDescriptions = async () => {
    try {
      const response = await axios.get('/api/admin/ai/field-descriptions');
      setFieldDescriptions(response.data.data);
    } catch (error) {
      console.error('Failed to load field descriptions:', error);
    }
  };

  const loadVocabularies = async () => {
    try {
      const response = await axios.get('/api/vocabulary-mappings');
      const vocabData = response.data;

      // Group by type
      const materials = vocabData
        .filter((v: any) => v.type === 'material')
        .map((v: any) => ({
          value: v.persian_terms[0],
          label: `${v.persian_terms[0]} (${v.category})`,
          category: v.category,
        }));

      const styles = vocabData
        .filter((v: any) => v.type === 'style')
        .map((v: any) => ({
          value: v.persian_terms[0],
          label: `${v.persian_terms[0]} (${v.category})`,
          category: v.category,
        }));

      const occasions = vocabData
        .filter((v: any) => v.type === 'occasion')
        .map((v: any) => ({
          value: v.persian_terms[0],
          label: `${v.persian_terms[0]} (${v.category})`,
          category: v.category,
        }));

      setVocabularies({ materials, styles, occasions });
    } catch (error) {
      console.error('Failed to load vocabularies:', error);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiGenerationEnabled) return;

    setIsGenerating(true);
    try {
      const response = await axios.post('/api/admin/ai/generate-metadata', {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        brand: formData.brand,
        price: formData.price,
        gender: formData.gender,
        images: formData.images,
        model: selectedModel,
      });

      const generated = response.data.data;

      // Update form with AI-generated data
      setFormData((prev) => ({
        ...prev,
        namePersian: generated.namePersian || prev.namePersian,
        descriptionPersian: generated.descriptionPersian || prev.descriptionPersian,
        keywords: generated.keywords || prev.keywords,
        tags: generated.tags || prev.tags,
        materialPersian: generated.materialPersian || prev.materialPersian,
        stylePersian: generated.stylePersian || prev.stylePersian,
        occasionTags: generated.occasionTags || prev.occasionTags,
        season: generated.season || prev.season,
        fitType: generated.fitType || prev.fitType,
        ageGroup: generated.ageGroup || prev.ageGroup,
      }));

      // Update keyword and tag inputs
      if (generated.keywords) {
        setKeywordsInput(generated.keywords.join(', '));
      }
      if (generated.tags) {
        setTagsInput(generated.tags.join(', '));
      }

      alert('✅ فیلدها با موفقیت توسط هوش مصنوعی پر شدند!\nلطفاً نتایج را بررسی و در صورت نیاز ویرایش کنید.');
    } catch (error: any) {
      console.error('AI generation failed:', error);
      alert('❌ خطا در تولید خودکار: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field: keyof ProductMetadataFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsInput(value);
    const keywords = value.split(',').map(k => k.trim()).filter(k => k);
    handleInputChange('keywords', keywords);
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = value.split(',').map(t => t.trim()).filter(t => t);
    handleInputChange('tags', tags);
  };

  const handleCheckboxChange = (field: 'occasionTags' | 'season', value: string) => {
    const currentValues = formData[field];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    handleInputChange(field, newValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const TooltipWrapper: React.FC<{ fieldName: string; children: React.ReactNode }> = ({ fieldName, children }) => (
    <div
      className="relative inline-block w-full"
      onMouseEnter={() => setShowTooltip(fieldName)}
      onMouseLeave={() => setShowTooltip(null)}
    >
      {children}
      {showTooltip === fieldName && fieldDescriptions[fieldName] && (
        <div className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2 w-64 rtl:right-full rtl:left-auto rtl:mr-2 rtl:ml-0">
          {fieldDescriptions[fieldName]}
          <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 transform rotate-45 rtl:-right-1 rtl:left-auto"></div>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">اطلاعات محصول</h2>
        <p className="text-sm text-gray-600">فیلدهای ضروری و اختیاری برای افزودن محصول</p>
      </div>

      {/* AI Model Selection and Generate Button */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 mr-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مدل هوش مصنوعی
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.recommended && '⭐'} - ${model.cost_per_1m_tokens}/1M tokens
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {availableModels.find(m => m.id === selectedModel)?.description}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateWithAI}
            disabled={!aiGenerationEnabled || isGenerating}
            className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
              aiGenerationEnabled && !isGenerating
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                در حال تولید...
              </span>
            ) : (
              '✨ تولید خودکار با AI'
            )}
          </button>
        </div>
        
        {!aiGenerationEnabled && (
          <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
            ⚠️ برای فعال‌سازی تولید خودکار، لطفاً فیلدهای نام، توضیحات، دسته‌بندی و قیمت را پر کنید.
          </p>
        )}
      </div>

      {/* Required Fields Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">فیلدهای ضروری (Required)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TooltipWrapper fieldName="name">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام محصول (انگلیسی) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Classic Cotton T-Shirt"
            />
          </TooltipWrapper>

          <TooltipWrapper fieldName="namePersian">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام محصول (فارسی) <span className="text-blue-500">🤖</span>
            </label>
            <input
              type="text"
              value={formData.namePersian}
              onChange={(e) => handleInputChange('namePersian', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="تیشرت کلاسیک پنبه‌ای"
              dir="rtl"
            />
          </TooltipWrapper>
        </div>

        <TooltipWrapper fieldName="description">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            توضیحات (انگلیسی) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="High-quality cotton t-shirt..."
          />
        </TooltipWrapper>

        <TooltipWrapper fieldName="descriptionPersian">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            توضیحات (فارسی) <span className="text-blue-500">🤖</span>
          </label>
          <textarea
            value={formData.descriptionPersian}
            onChange={(e) => handleInputChange('descriptionPersian', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="تیشرت با کیفیت عالی از جنس پنبه..."
            dir="rtl"
          />
        </TooltipWrapper>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              دسته‌بندی <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="T-Shirts"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              برند
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nike"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="250000"
            />
          </div>
        </div>

        <TooltipWrapper fieldName="gender">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            جنسیت <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="مردانه">مردانه</option>
            <option value="زنانه">زنانه</option>
            <option value="یونیسکس">یونیسکس</option>
          </select>
        </TooltipWrapper>
      </div>

      {/* AI-Generated Fields Section */}
      <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-blue-200 pb-2">
          فیلدهای قابل تولید با AI <span className="text-blue-500 text-sm">🤖</span>
        </h3>

        <TooltipWrapper fieldName="keywords">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            کلمات کلیدی (فارسی، با کاما جدا شوند) <span className="text-blue-500">🤖</span>
          </label>
          <input
            type="text"
            value={keywordsInput}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="تیشرت، پیراهن آستین کوتاه، تی شرت"
            dir="rtl"
          />
          <p className="text-xs text-gray-500 mt-1">تعداد: {formData.keywords.length}</p>
        </TooltipWrapper>

        <TooltipWrapper fieldName="tags">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            برچسب‌ها (فارسی، با کاما جدا شوند) <span className="text-blue-500">🤖</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => handleTagsChange(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="اسپرت، راحت، تابستانی"
            dir="rtl"
          />
          <p className="text-xs text-gray-500 mt-1">تعداد: {formData.tags.length}</p>
        </TooltipWrapper>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TooltipWrapper fieldName="materialPersian">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              جنس (فارسی) <span className="text-blue-500">🤖</span>
            </label>
            <select
              value={formData.materialPersian}
              onChange={(e) => handleInputChange('materialPersian', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- انتخاب کنید --</option>
              {vocabularies.materials.map((mat) => (
                <option key={mat.value} value={mat.value}>
                  {mat.label}
                </option>
              ))}
            </select>
          </TooltipWrapper>

          <TooltipWrapper fieldName="stylePersian">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              استایل (فارسی) <span className="text-blue-500">🤖</span>
            </label>
            <select
              value={formData.stylePersian}
              onChange={(e) => handleInputChange('stylePersian', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- انتخاب کنید --</option>
              {vocabularies.styles.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </TooltipWrapper>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TooltipWrapper fieldName="fitType">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نوع برازش <span className="text-blue-500">🤖</span>
            </label>
            <select
              value={formData.fitType}
              onChange={(e) => handleInputChange('fitType', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="معمولی">معمولی (Regular)</option>
              <option value="تنگ">تنگ (Slim)</option>
              <option value="گشاد">گشاد (Oversized)</option>
            </select>
          </TooltipWrapper>

          <TooltipWrapper fieldName="ageGroup">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              گروه سنی <span className="text-blue-500">🤖</span>
            </label>
            <select
              value={formData.ageGroup}
              onChange={(e) => handleInputChange('ageGroup', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="بزرگسال">بزرگسال (Adult)</option>
              <option value="نوجوان">نوجوان (Teen)</option>
              <option value="کودک">کودک (Child)</option>
            </select>
          </TooltipWrapper>
        </div>

        <TooltipWrapper fieldName="occasionTags">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            موقعیت‌های استفاده <span className="text-blue-500">🤖</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {vocabularies.occasions.map((occ) => (
              <label key={occ.value} className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="checkbox"
                  checked={formData.occasionTags.includes(occ.value)}
                  onChange={() => handleCheckboxChange('occasionTags', occ.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{occ.value}</span>
              </label>
            ))}
          </div>
        </TooltipWrapper>

        <TooltipWrapper fieldName="season">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            فصل‌های مناسب <span className="text-blue-500">🤖</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['بهار', 'تابستان', 'پاییز', 'زمستان'].map((season) => (
              <label key={season} className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="checkbox"
                  checked={formData.season.includes(season)}
                  onChange={() => handleCheckboxChange('season', season)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{season}</span>
              </label>
            ))}
          </div>
        </TooltipWrapper>
      </div>

      {/* Auto-Generated Fields Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">فیلدهای خودکار</h3>
        <p className="text-sm text-gray-600 mb-2">
          این فیلدها به صورت خودکار توسط سیستم پر می‌شوند و نیازی به ورودی ندارند:
        </p>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>جنس انگلیسی</strong> - از واژه‌نامه استخراج می‌شود</li>
          <li>• <strong>برچسب‌های جنس</strong> - از واژه‌نامه استخراج می‌شود</li>
          <li>• <strong>استایل انگلیسی</strong> - از واژه‌نامه استخراج می‌شود</li>
          <li>• <strong>رنگ‌های فارسی</strong> - از تنوع‌های محصول استخراج می‌شود</li>
          <li>• <strong>امتیاز محبوبیت</strong> - بر اساس فروش و بازدید محاسبه می‌شود</li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            انصراف
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          ذخیره محصول
        </button>
      </div>
    </form>
  );
};

export default AIProductMetadataForm;
