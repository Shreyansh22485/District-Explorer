str(dhcb_education_medium1)
dim(dhcb_education_medium1)

dhcb_education_medium1.Scaled <- scale(dhcb_education_medium1[,3:29])

head(dhcb_education_medium1.Scaled)

colnames(dhcb_education_medium1.Scaled)

dhcb_education_medium1.Scaled1<-dhcb_education_medium1.Scaled[,-c(18,25)]
#no "Total.Medicine.College and Total.School.For.Disabled in villages having population b/w 1000 and 2500

wssplot <- function(data, nc=15, seed=3110){
  wss <- (nrow(data)-1)*sum(apply(data,2,var))
  for (i in 2:nc){
    set.seed(seed)
    wss[i] <- sum(kmeans(data, centers=i)$withinss)}
  plot(1:nc, wss, type="b", xlab="Number of Clusters",
       ylab="Within groups sum of squares")}

wssplot(dhcb_education_medium1.Scaled1, nc=5)

sum(is.na(dhcb_education_medium1.Scaled1))

sum(is.na(dhcb_education_medium1.Scaled1))

colnames(dhcb_education_medium1.Scaled1)

kmeans.clus = kmeans(x=dhcb_education_medium1.Scaled1, centers = 4, nstart = 3)

dhcb_education_medium1$Clusters <- kmeans.clus$cluster

colnames(dhcb_education_medium1)

aggr = aggregate(dhcb_education_medium1[,-c(1,2,20,27)],list(dhcb_education_medium1$Clusters),mean)

write.csv(dhcb_education_medium1,file="dhcb_education_medium1.csv")

write.csv(aggr,file="dhcb_education_medium11.csv")

getwd()


