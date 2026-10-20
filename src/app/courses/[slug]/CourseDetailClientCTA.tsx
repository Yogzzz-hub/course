"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EnquiryModal } from "@/components/public/EnquiryModal";
import { ArrowRight, Mail } from "lucide-react";

export function CourseDetailClientCTA({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto"
        >
          <span>Request Admissions Consultation</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <EnquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultCourseId={courseId}
        defaultCourseTitle={courseTitle}
      />
    </>
  );
}
