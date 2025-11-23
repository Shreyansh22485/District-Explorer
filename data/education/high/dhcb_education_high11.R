str(dhcb_education_high)
dim(dhcb_education_high)
colnames(dhcb_education_high)

dhcb_education_high.Scaled <- scale(dhcb_education_high[,3:29])

head(dhcb_education_high.Scaled)

colnames(dhcb_education_high.Scaled)

dhcb_education_high.Scaled1<-dhcb_education_high.Scaled[,-c(25)]
#no "Total.School.For.Disabled in villages having population above 2500

wssplot <- function(data, nc=15, seed=3110){
  wss <- (nrow(data)-1)*sum(apply(data,2,var))
  for (i in 2:nc){
    set.seed(seed)
    wss[i] <- sum(kmeans(data, centers=i)$withinss)}
  plot(1:nc, wss, type="b", xlab="Number of Clusters",
       ylab="Within groups sum of squares")}

wssplot(dhcb_education_high.Scaled1, nc=5)

sum(is.na(dhcb_education_high.Scaled1))

colnames(dhcb_education_high.Scaled1)

kmeans.clus = kmeans(x=dhcb_education_high.Scaled1, centers = 4)

dhcb_education_high$Clusters <- kmeans.clus$cluster

colnames(dhcb_education_high)

aggr = aggregate(dhcb_education_high[,-c(1,2,27)],list(dhcb_education_high$Clusters),mean)

write.csv(dhcb_education_high,file="dhcb_education_high.csv")

write.csv(aggr,file="dhcb_education_high1.csv")

getwd()


