// frontend/src/components/ComplaintKanban.tsx


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Complaint } from '../types';
import { complaintService } from '../services/complaints';

interface ComplaintKanbanProps {
  complaints: Complaint[];
  onStatusChange?: () => void;
}

const ComplaintKanban: React.FC<ComplaintKanbanProps> = ({ complaints, onStatusChange }) => {
  const navigate = useNavigate();
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null);
  const [targetColumn, setTargetColumn] = useState<string | null>(null);

  const columns = [
    { id: 'new', title: 'New', color: 'bg-red-500/20 border-red-500/50' },
    { id: 'acknowledged', title: 'Acknowledged', color: 'bg-yellow-500/20 border-yellow-500/50' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500/20 border-blue-500/50' },
    { id: 'resolved', title: 'Resolved', color: 'bg-green-500/20 border-green-500/50' },
    { id: 'closed', title: 'Closed', color: 'bg-gray-500/20 border-gray-500/50' },
  ];

  const getComplaintsByStatus = (status: string) => {
    return complaints.filter((c) => c.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-l-red-500';
      case 'high':
        return 'border-l-4 border-l-orange-500';
      case 'medium':
        return 'border-l-4 border-l-yellow-500';
      case 'low':
        return 'border-l-4 border-l-green-500';
      default:
        return 'border-l-4 border-l-gray-500';
    }
  };

  const handleDragStart = (e: React.DragEvent, complaint: Complaint) => {
    setDraggedComplaint(complaint);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setTargetColumn(status);
  };

  const handleDragLeave = () => {
    setTargetColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setTargetColumn(null);

    if (!draggedComplaint || draggedComplaint.status === newStatus) {
      setDraggedComplaint(null);
      return;
    }

    try {
      await complaintService.updateStatus(draggedComplaint.id!, newStatus);
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Failed to update complaint status:', error);
      alert('Failed to update complaint status. Please try again.');
    } finally {
      setDraggedComplaint(null);
    }
  };

  const handleCardClick = (complaintId?: string) => {
    if (complaintId) {
      navigate(`/complaints/${complaintId}`);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '600px' }}>
      {columns.map((column) => {
        const columnComplaints = getComplaintsByStatus(column.id);
        const isTarget = targetColumn === column.id;

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-72 rounded-lg border-2 p-4 transition-colors ${
              isTarget
                ? `${column.color} border-dashed`
                : 'bg-dark-bg-card border-border'
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                {column.title}
              </h3>
              <span className="text-sm text-text-secondary">
                {columnComplaints.length} {columnComplaints.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="space-y-3">
              {columnComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, complaint)}
                  onClick={() => handleCardClick(complaint.id)}
                  className={`bg-dark-bg-secondary rounded-lg p-3 border border-border cursor-move hover:border-primary-purple transition-colors ${getPriorityColor(
                    complaint.priority
                  )}`}
                >
                  <div className="mb-2">
                    <h4 className="font-medium text-text-primary text-sm mb-1 line-clamp-2">
                      {complaint.subject}
                    </h4>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {complaint.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${
                      complaint.priority === 'urgent'
                        ? 'text-red-400'
                        : complaint.priority === 'high'
                        ? 'text-orange-400'
                        : complaint.priority === 'medium'
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}>
                      {complaint.priority.toUpperCase()}
                    </span>
                    {(complaint as any).ticket_number && (
                      <span className="text-text-secondary font-mono">
                        #{(complaint as any).ticket_number}
                      </span>
                    )}
                  </div>

                  {complaint.created_date && (
                    <div className="mt-2 text-xs text-text-secondary">
                      {new Date(complaint.created_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}

              {columnComplaints.length === 0 && (
                <div className="text-center py-8 text-text-secondary text-sm">
                  No complaints
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ComplaintKanban;

