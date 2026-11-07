class ModelMonitor
  def self.call(organization)
    version = ModelRegistry.active_for(organization)
    return {status: "no_model", features: [], feedback: {labeled: 0}} unless version
    records = Assessment.where(organization: organization, model_version: version.version).order(created_at: :desc).limit(5000).pluck(:data)
    baseline = version.metadata.fetch("baseline_histograms", {})
    names = version.metadata.fetch("feature_names")
    features = names.each_with_index.map do |name, index|
      reference = baseline[name]
      values = records.filter_map { |row| row.fetch("features")[index] }
      next {name: name, samples: values.length, psi: nil, status: "insufficient_data"} unless reference.is_a?(Hash) && values.length >= 50
      counts = Array.new(reference.fetch("counts").length, 0.0)
      edges = reference.fetch("edges")
      values.each do |value|
        bin = edges.drop(1).take(edges.length - 2).count { |edge| value >= edge }
        counts[bin] += 1
      end
      expected = reference.fetch("counts").map { |count| count.to_f + 0.5 }
      observed = counts.map { |count| count + 0.5 }
      left, right = expected.sum, observed.sum
      psi = expected.zip(observed).sum { |a, b| p, q = a / left, b / right; (q - p) * Math.log(q / p) }
      {name: name, samples: values.length, psi: psi, status: psi >= 0.25 ? "drift" : psi >= 0.1 ? "watch" : "stable"}
    end
    labels = AnalystFeedback.where(organization: organization).includes(fraud_case: {alert: :assessment}).order(created_at: :desc, id: :desc).limit(10_000).to_a
    latest = labels.group_by { |row| row.fraud_case.alert.assessment.transaction_id }.values.map(&:first)
    confusion = {true_positive: 0, false_positive: 0, true_negative: 0, false_negative: 0}
    latest.each do |row|
      next if row.outcome == "inconclusive"
      assessment = row.fraud_case.alert.assessment
      next unless assessment.model_version == version.version
      truth = row.outcome == "confirmed_fraud"
      prediction = assessment.data.fetch("fraud_probability") >= assessment.data.fetch("decision_threshold")
      key = prediction ? (truth ? :true_positive : :false_positive) : (truth ? :false_negative : :true_negative)
      confusion[key] += 1
    end
    tp, fp, fn = confusion.values_at(:true_positive, :false_positive, :false_negative)
    precision = tp + fp > 0 ? tp.to_f / (tp + fp) : nil
    recall = tp + fn > 0 ? tp.to_f / (tp + fn) : nil
    {status: records.length >= 50 ? "measured" : "insufficient_data", model_version: version.version, features: features, feedback: confusion.merge(labeled: confusion.values.sum, precision: precision, recall: recall), observed_at: Time.current.iso8601}
  end
end
