"use client";

import { useEffect, useState } from "react";
import { useSliderStore } from "@/store/slider-store";
import { Slider } from "@/types/slider";
import Button from "@/components/ui/Button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import SliderForm from "./SliderForm";

export default function SlidersPage() {
  const { sliders, fetchSliders, deleteSlider, isLoading, error } = useSliderStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlider, setSelectedSlider] = useState<Slider | null>(null);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  const handleCreate = () => {
    setSelectedSlider(null);
    setIsModalOpen(true);
  };

  const handleEdit = (slider: Slider) => {
    setSelectedSlider(slider);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("آیا از حذف این اسلاید مطمئن هستید؟")) {
      await deleteSlider(id);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت اسلایدرها</h1>
        <Button onClick={handleCreate}>
          <Plus className="ml-2" />
          افزودن اسلاید
        </Button>
      </div>
      
      {isLoading && <p>در حال بارگذاری...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {sliders.map((slider) => (
          <motion.div
            key={slider.id}
            className="bg-white rounded-lg shadow p-4 flex flex-col justify-between"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div>
              <img src={slider.image} alt={slider.title} className="w-full h-40 object-cover rounded-md mb-4" />
              <h2 className="text-lg font-semibold">{slider.title}</h2>
              <p className="text-sm text-gray-600">{slider.subtitle}</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => handleEdit(slider)}>
                <Edit size={16} />
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(slider.id!)}>
                <Trash2 size={16} />
              </Button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {isModalOpen && (
        <SliderForm 
          slider={selectedSlider} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
} 